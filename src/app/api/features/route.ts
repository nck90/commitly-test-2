import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    try {
        const features = await prisma.feature.findMany({
            where: {
                projectId: projectId
            },
            include: {
                checklists: true,
            },
            orderBy: {
                sortOrder: 'asc'
            }
        });

        // Map Prisma models to the frontend expect format
        const mappedFeatures = features.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description || "",
            clientDescription: f.clientDescription || "",
            status: f.status,
            priority: f.priority,
            progress: f.progressPercentage,
            dueDate: f.dueDate ? f.dueDate.toISOString().split('T')[0] : "",
            checklist: f.checklists.map(c => ({
                id: c.id,
                text: c.content,
                done: c.isCompleted
            })),
            discussions: [] // Assuming discussions are fetched separately or joined here later
        }));

        return NextResponse.json(mappedFeatures);
    } catch (error: any) {
        console.error("Features API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
