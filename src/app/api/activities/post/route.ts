import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notificationService } from "@/lib/notifications";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    // Removed role restriction so clients can also post schedule change requests or overall requests.
    // if (role !== "developer" && role !== "agency") {
    //     return NextResponse.json({ error: "Only developers can post to the feed" }, { status: 403 });
    // }

    const { projectId, type, title, content, clientSummary } = await req.json();


    if (!projectId || !type || !title || !content) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        let entry;
        let actionType: 'UPDATED' | 'DECISION_REQUESTED' = 'UPDATED';

        if (type === "decision") {
            entry = await prisma.decision.create({
                data: {
                    projectId,
                    authorId: userId,
                    title,
                    description: content,
                    clientContext: clientSummary,
                    status: "pending",
                }
            });
            actionType = 'DECISION_REQUESTED';
        } else if (type === "risk") {
            entry = await prisma.risk.create({
                data: {
                    projectId,
                    title,
                    description: content,
                    severity: "medium", // Default
                    status: "active",
                }
            });
            actionType = 'UPDATED';
        } else {
            // Default to Update
            entry = await prisma.update.create({
                data: {
                    projectId,
                    authorId: userId,
                    title,
                    content,
                    clientSummary,
                    status: "new",
                }
            });
            actionType = 'UPDATED';
        }

        // Fetch project and user info for the notification
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        const actor = await prisma.user.findUnique({ where: { id: userId } });

        if (project && actor) {
            await notificationService.dispatchNotification({
                projectId,
                projectName: project.name,
                actorName: actor.name || actor.email || 'Unknown User',
                actionType,
                detail: title,
                link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${projectId}/feed`
            });
        }

        return NextResponse.json(entry);
    } catch (error: any) {
        console.error("Post Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
