import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { summarizePRForClient } from "@/app/actions/aiReplies";

// This is a simplified webhook handler for demonstration.
// In a real app, you would verify the HMAC signature from GitHub.
export async function POST(req: Request) {
    try {
        const event = req.headers.get("x-github-event");
        const payload = await req.json();

        // Basic validation
        if (!payload.repository || !payload.repository.html_url) {
            return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
        }

        const repoUrl = payload.repository.html_url;

        // Find which project(s) this repo belongs to
        const projects = await prisma.project.findMany({
            where: {
                githubRepoUrl: repoUrl
            }
        });

        if (projects.length === 0) {
            return NextResponse.json({ message: "No matching project found for this repo" }, { status: 200 }); // Return 200 so GitHub stops retrying
        }

        // Handle different event types
        if (event === "push") {
            const commits = payload.commits || [];
            if (commits.length === 0) {
                return NextResponse.json({ message: "No commits in push" }, { status: 200 });
            }

            for (const project of projects) {
                const features = await prisma.feature.findMany({ where: { projectId: project.id } });

                for (const commit of commits) {
                    const message = commit.message as string;
                    const authorName = commit.author?.name || "Unknown GitHub User";
                    const commitUrl = commit.url;
                    // 1. Parse Commit Message for Feature updates
                    // GitHub Actions/Webhooks usually send messages like "feat: implement Login UI (#12)"
                    // Try to match the exact feature name for a robust link
                    for (const feature of features) {
                        const isMatch = message.toLowerCase().includes(feature.name.toLowerCase()) || 
                                        message.includes(`[${feature.name}]`) ||
                                        message.includes(`TSK-${feature.id.substring(0, 4)}`);

                        if (isMatch && feature.status !== "done") {
                            await prisma.feature.update({
                                where: { id: feature.id },
                                data: {
                                    status: "done",
                                    progressPercentage: 100
                                }
                            });

                            // Add a timeline update specifically for this feature being completed
                            if (project.agencyId) {
                                await prisma.update.create({
                                    data: {
                                        projectId: project.id,
                                        featureId: feature.id,
                                        authorId: project.agencyId,
                                        title: `[GitHub] ${feature.name} 배포 완료 🎉`,
                                        content: `GitHub 저장소의 코드 통합이 완료되어 **${feature.name}** 채널의 상태가 \`완료(100%)\`로 자동 업데이트 되었습니다.\n\n커밋 요약: \`${message.split('\\n')[0]}\`\n[👉 코드 변경점 확인하기](${commitUrl})`,                                            
                                        status: "new"
                                    }
                                });
                            }
                        }
                    }
                }
            }

        } else if (event === "pull_request") {
            const prAction = payload.action;
            const pr = payload.pull_request;
            
            if (prAction === "opened" || prAction === "closed") {
                const clientSummaryText = await summarizePRForClient(pr.title, pr.body);

                for (const project of projects) {
                    if (project.agencyId) {
                        const statusText = prAction === "closed" && pr.merged ? "Merged" : prAction;
                        await prisma.update.create({
                            data: {
                                projectId: project.id,
                                authorId: project.agencyId,
                                title: `기능 업데이트 내역 공유 (${statusText})`,
                                content: `**[Developer Note: ${pr.title}]**\n[👉 전문 보기](${pr.html_url})`,
                                clientSummary: clientSummaryText,
                                status: "new"
                            }
                        });
                    }
                }
            }
        }

        return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
