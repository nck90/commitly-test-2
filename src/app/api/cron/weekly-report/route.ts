import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

export async function GET(req: Request) {
    // In production, you would check for an authorization header (e.g. from Vercel Cron)
    // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    try {
        const activeProjects = await prisma.project.findMany({
            where: { status: "active" },
            include: {
                updates: {
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 7)) // last 7 days
                        }
                    }
                },
                decisions: {
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 7))
                        }
                    }
                },
                risks: {
                    where: {
                        status: "active"
                    }
                },
                features: true
            }
        });

        let reportsGenerated = 0;

        for (const project of activeProjects) {
            // Calculate Health Score based on real project metrics
            let healthScore = 100;
            
            // 1. Penalize for unresolved active risks (10 points each)
            healthScore -= project.risks.length * 10;
            
            // 2. Penalize for pending decisions older than 3 days (5 points each)
            const pendingDecisions = project.decisions.filter(d => d.status === "pending");
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const oldPendingDecisions = pendingDecisions.filter(d => new Date(d.createdAt) < threeDaysAgo);
            healthScore -= oldPendingDecisions.length * 5;

            // 3. Reward for updates/commits this week (2 points each)
            healthScore += project.updates.length * 2;
            
            // Bound score between 0 and 100
            healthScore = Math.min(100, Math.max(0, healthScore));

            // Generate AI Summary using Groq
            let aiSummary = "주간 활동이 없습니다. 개발팀의 상황을 확인해보세요.";
            
            const completedFeatCount = project.features.filter(f => f.status === "done").length;
            const totalFeatCount = project.features.length;
            const progressNum = totalFeatCount === 0 ? 0 : Math.round((completedFeatCount / totalFeatCount) * 100);

            if (project.updates.length > 0 || pendingDecisions.length > 0) {
                if (groq) {
                    try {
                        const prompt = `당신은 IT 프로젝트 매니저(AI 보조)입니다. 
다음은 이번 주 프로젝트 상황입니다:
- 업데이트 건수: ${project.updates.length}건
- 미해결 결정 요청: ${pendingDecisions.length}건
- 현재 종합 진척률: ${progressNum}%
- 시스템 산출 건강도: ${healthScore}점 (100점 만점)

발주사(Client)가 안심할 수 있도록, 이 데이터들을 바탕으로 3~4문장 분량의 이번 주 "주간 AI 브리핑"을 전문적이고 정중한 톤으로 요약 작성해주세요. Markdown 없이 순수 텍스트만 출력하세요.`;

                        const chatCompletion = await groq.chat.completions.create({
                            messages: [{ role: "user", content: prompt }],
                            model: "llama-3.1-8b-instant",
                            temperature: 0.3,
                            max_tokens: 300,
                        });
                        aiSummary = chatCompletion.choices[0]?.message?.content || "";
                    } catch (e) {
                        console.error("Groq AI API Failed for Weekly Report", e);
                        aiSummary = `이번 주에 ${project.updates.length}건의 업데이트가 발생했습니다. 현재 진행률은 ${progressNum}%이며, 건강도는 ${healthScore}점입니다.`;
                    }
                } else {
                    aiSummary = `이번 주에 ${project.updates.length}건의 주요 업데이트(커밋, PR 등)가 발생했습니다. `;
                    if (pendingDecisions.length > 0) {
                        aiSummary += `현재 클라이언트님의 확인이 필요한 결정 사항이 ${pendingDecisions.length}건 대기 중입니다. 빠른 확인을 부탁드립니다. `;
                    }
                    aiSummary += `전체 진척률은 약 ${progressNum}%를 보이고 있으며, 현재 건강 상태는 ${healthScore >= 80 ? '매우 양호' : healthScore >= 50 ? '주의 필요' : '위험'}합니다.`;
                }
            }

            // Save the health score to the project
            await prisma.project.update({
                where: { id: project.id },
                data: { healthScore }
            });

            // Save the newly generated AI report as an Update so the client sees it on Feed and Dashboard
            const validAuthorId = project.agencyId || project.clientId;
            if (validAuthorId && (project.updates.length > 0 || pendingDecisions.length > 0)) {
                await prisma.update.create({
                    data: {
                        projectId: project.id,
                        authorId: validAuthorId,
                        title: `[시스템] 🤖 주간 AI 리포트 산출 완료`,
                        content: `**[${new Date().toLocaleDateString()}] 주간 프로젝트 분석 결과**\n\nAI가 지난 7일간의 활동 내역을 분석하여 리포트를 생성했습니다.\n\n- 발생한 활동 건수: ${project.updates.length}건\n- 대기 중인 결정 사항: ${pendingDecisions.length}건\n- 종합 건강도: ${healthScore}점`,
                        clientSummary: aiSummary,
                        status: "new"
                    }
                });
                reportsGenerated++;
            }
        }

        return NextResponse.json({ 
            message: "Weekly reports processed successfully", 
            reportsGenerated 
        }, { status: 200 });

    } catch (error: any) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
