import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const features = await prisma.feature.findMany({
        select: { id: true, name: true, projectId: true }
    });
    return NextResponse.json(features);
}
