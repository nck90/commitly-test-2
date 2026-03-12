import prisma from "@/lib/prisma";
import { ArrowLeft, FileEdit, AlertCircle, Save, Calendar, CheckSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FeatureDetailClient } from "./FeatureDetailClient";

export default async function FeatureDetailPage({ params }: { params: Promise<{ id: string, featureId: string }> }) {
    const { id, featureId } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: { scopeDocs: true }
    });

    const feature = await prisma.feature.findUnique({
        where: { id: featureId },
        include: {
            checklists: {
                orderBy: { createdAt: 'asc' }
            },
            replies: {
                include: { author: true },
                orderBy: { createdAt: 'asc' }
            },
            updates: {
                include: { author: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!project || !feature) notFound();

    return <FeatureDetailClient project={project} feature={feature} />;
}
