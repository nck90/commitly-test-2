import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { email } = body;

        let developer = await prisma.user.findUnique({ where: { email } });
        
        if (!developer) {
            // Create a shell user for the invited developer
            developer = await prisma.user.create({
                data: {
                    email,
                    role: "developer"
                }
            });
        } else if (developer.role !== "developer" && developer.role !== null) {
            return NextResponse.json({ error: "해당 사용자는 개발자(파트너) 계정이 아닙니다." }, { status: 400 });
        }

        const project = await prisma.project.findUnique({
            where: { id },
            select: { workspaceId: true, agencyId: true }
        });

        if (!project) {
            return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
        }

        if (project.agencyId) {
             return NextResponse.json({ error: "이미 파트너가 연결된 프로젝트입니다." }, { status: 400 });
        }

        // Check if an invite already exists
        const existingInvite = await prisma.projectInvite.findUnique({
            where: {
                projectId_agencyId: {
                    projectId: id,
                    agencyId: developer.id
                }
            }
        });

        if (existingInvite) {
            if (existingInvite.status === "PENDING") {
                 return NextResponse.json({ error: "이미 초대를 대기 중인 파트너입니다." }, { status: 400 });
            } else if (existingInvite.status === "ACCEPTED") {
                 return NextResponse.json({ error: "이미 연결된 파트너입니다." }, { status: 400 });
            } else {
                 // REJECTED case - we can create a new invite by updating the status
                 await prisma.projectInvite.update({
                     where: { id: existingInvite.id },
                     data: { status: "PENDING" }
                 });
                 return NextResponse.json({ success: true, message: "재초대 되었습니다." });
            }
        }

        // Create new invite
        await prisma.projectInvite.create({
            data: {
                projectId: id,
                agencyId: developer.id,
                status: "PENDING"
            }
        });

        return NextResponse.json({ success: true, message: "초대가 발송되었습니다." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
