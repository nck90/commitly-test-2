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
    const { targetId, targetType, action, comment } = await req.json();

    if (!targetId || !action) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        let projectId = "";
        let projectName = "";
        let detail = "";
        const actionType = action === "confirmed" ? "CONFIRMED" : "REJECTED";

        if (targetType === "decision") {
            const newStatus = action === "confirmed" ? "approved" : "revision_requested";
            const decision = await prisma.decision.update({
                where: { id: targetId },
                data: {
                    status: newStatus,
                    decidedAt: newStatus === "approved" ? new Date() : null,
                },
                include: { project: true }
            });
            if (decision.project) { projectId = decision.project.id; projectName = decision.project.name; }
            detail = `결정 요청 "${decision.title}"에 대해 ${actionType} 하였습니다. ${comment || ""}`;

            await prisma.reply.create({
                data: {
                    authorId: userId,
                    decisionId: targetId,
                    content: action === "confirmed" ? "✅ 승인 완료" : `❌ 수정 요청: ${comment || ""}`,
                }
            });

        } else if (targetType === "risk") {
            const newStatus = action === "confirmed" ? "resolved" : "active";
            const risk = await prisma.risk.update({
                where: { id: targetId },
                data: {
                    status: newStatus
                },
                include: { project: true }
            });
            if (risk.project) { projectId = risk.project.id; projectName = risk.project.name; }
            detail = `위험 요소 "${risk.title}"에 대해 ${actionType} 하였습니다. ${comment || ""}`;

            await prisma.reply.create({
                data: {
                    authorId: userId,
                    riskId: targetId,
                    content: action === "confirmed" ? "✅ 확인됨" : `❌ 추가 검토: ${comment || ""}`,
                }
            });

        } else {
            // Default assumes targetType === "update" (or missing type falls back here)
            const confirmation = await prisma.confirmation.create({
                data: {
                    updateId: targetId,
                    userId: userId,
                    action: action, 
                    comment: comment || "",
                }
            });

            const update = await prisma.update.update({
                where: { id: targetId },
                data: { status: "checked" },
                include: { project: true }
            });
            if (update.project) { projectId = update.project.id; projectName = update.project.name; }
            detail = `업데이트 내용에 대해 ${actionType} 하였습니다. ${comment || ""}`;
        }

        const actor = await prisma.user.findUnique({ where: { id: userId } });
        if (actor && projectId) {
            await notificationService.dispatchNotification({
                projectId,
                projectName,
                actorName: actor.name || actor.email || 'Unknown User',
                actionType: actionType as 'CONFIRMED' | 'REJECTED',
                detail,
                link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${projectId}/feed`
            });
        }

        return NextResponse.json({ message: "Success" });
    } catch (error: any) {
        console.error("Confirm Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
