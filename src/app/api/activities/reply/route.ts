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
    const { targetId, targetType, content } = await req.json();

    if (!targetId || !targetType || !content) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        let reply;
        let projectId = "";
        let projectName = "";

        if (targetType === "update") {
            reply = await prisma.confirmation.create({
                data: {
                    updateId: targetId,
                    userId: userId,
                    action: "question",
                    comment: content,
                }
            });
            const parent = await prisma.update.findUnique({ where: { id: targetId }, include: { project: true } });
            if (parent?.project) { projectId = parent.project.id; projectName = parent.project.name; }

        } else if (targetType === "decision") {
            reply = await prisma.reply.create({
                data: {
                    authorId: userId,
                    decisionId: targetId,
                    content: content,
                }
            });
            const parent = await prisma.decision.findUnique({ where: { id: targetId }, include: { project: true } });
            if (parent?.project) { projectId = parent.project.id; projectName = parent.project.name; }

        } else if (targetType === "risk") {
            reply = await prisma.reply.create({
                data: {
                    authorId: userId,
                    riskId: targetId,
                    content: content,
                }
            });
            const parent = await prisma.risk.findUnique({ where: { id: targetId }, include: { project: true } });
            if (parent?.project) { projectId = parent.project.id; projectName = parent.project.name; }

        } else {
            return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
        }

        const actor = await prisma.user.findUnique({ where: { id: userId } });
        if (actor && projectId) {
            await notificationService.dispatchNotification({
                projectId,
                projectName,
                actorName: actor.name || actor.email || 'Unknown User',
                actionType: 'COMMENTED',
                detail: content,
                link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${projectId}/feed`
            });
        }

        return NextResponse.json(reply);
    } catch (error: any) {
        console.error("Reply Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
