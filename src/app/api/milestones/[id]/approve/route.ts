import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: milestoneId } = await params;
        
        // Update milestone status to 'paid' (or approved)
        const updatedMilestone = await prisma.milestone.update({
            where: { id: milestoneId },
            data: { 
                status: "paid",
                paidAt: new Date()
            }
        });

        return NextResponse.json(updatedMilestone);
    } catch (error: any) {
        console.error("Milestone Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
