import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateFeatureDescription } from "@/app/actions/aiExtraction";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: featureId } = await params;

    try {
        const feature = await prisma.feature.findUnique({ 
            where: { id: featureId },
            include: { project: { include: { scopeDocs: true } } }
        });

        if (!feature) {
             return NextResponse.json({ error: "Feature not found" }, { status: 404 });
        }

        const scopeDocs = feature.project.scopeDocs;
        let combinedText = "";

        if (scopeDocs && scopeDocs.length > 0) {
            combinedText = scopeDocs.map(doc => `[문서: ${doc.title}]\n${doc.textContent || ""}`).join("\n\n");
        }

        if (!combinedText.trim()) {
            return NextResponse.json({ error: "프로젝트에 분석할 기획 문서가 등록되어 있지 않습니다." }, { status: 400 });
        }

        const description = await generateFeatureDescription(feature.name, combinedText);

        const updatedFeature = await prisma.feature.update({
            where: { id: featureId },
            data: { description: description }
        });

        return NextResponse.json(updatedFeature);
    } catch (error: any) {
        console.error("AI Feature Description Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
