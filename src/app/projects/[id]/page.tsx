import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardRoleView } from "./DashboardClient";
import { detectRisks } from "@/lib/riskEngine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export default async function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect("/login");
    const userId = (session.user as any).id;

    const project = await (prisma.project as any).findUnique({
        where: { id },
        include: {
            features: true,
            updates: true,
            decisions: true,
            risks: true,
            scopeDocs: true,
            milestones: { orderBy: { sortOrder: 'asc' } }
        }
    });

    if (!project) redirect("/");

    const p = project as any;

    // Security Check: Only Client or Assigned Agency can access
    const isClient = p.clientId === userId;
    const isAgency = p.agencyId === userId;
    
    if (!isClient && !isAgency) {
        redirect("/");
    }

    const risks = await detectRisks(id);
    
    // Calculate a dynamic risk score based on detected risks
    // Base health is 100, each risk reduces it.
    let calculatedRiskScore = 0;
    risks.forEach(r => {
        if (r.severity === 'high') calculatedRiskScore += 40;
        else if (r.severity === 'medium') calculatedRiskScore += 20;
        else calculatedRiskScore += 10;
    });
    const riskScore = Math.min(100, calculatedRiskScore);

    const totalFeatures = p.features.length;
    const completedFeatures = p.features.filter((f: any) => f.status === 'done').length;
    const inProgressFeatures = p.features.filter((f: any) => f.status === 'in_progress').length;
    const progress = totalFeatures === 0 ? 0 : Math.round((completedFeatures / totalFeatures) * 100);
    const pendingDecisions = p.decisions.filter((d: any) => d.status === 'pending').length;
    
    const latestUpdateWithSummary = p.updates
        .filter((u: any) => u.clientSummary)
        .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    const latestAiSummary = latestUpdateWithSummary?.clientSummary || "최근 업데이트 정보가 없습니다. 개발팀의 새 소식을 기다려주세요.";

    const nextMilestone = p.milestones?.find((m: any) => m.status === 'upcoming') || null;
    const nextMilestoneDate = nextMilestone?.targetDate || null;

    const combinedActivities = [
        ...p.updates.map((u: any) => ({
            id: u.id,
            title: u.title,
            content: u.content,
            clientSummary: u.clientSummary,
            createdAt: u.createdAt,
            authorName: "개발팀"
        })),
        ...p.decisions.map((d: any) => ({
            id: d.id,
            title: `[결정 요청] ${d.title}`,
            content: d.description,
            clientSummary: d.clientContext || "클라이언트의 확인 및 결정이 필요합니다.",
            createdAt: d.createdAt,
            authorName: "개발팀"
        })),
        ...p.risks.map((r: any) => ({
            id: r.id,
            title: `[주의/리스크] ${r.title}`,
            content: r.description,
            clientSummary: "프로젝트 진행에 영향을 줄 수 있는 주의사항이 발생했습니다.",
            createdAt: r.createdAt,
            authorName: "시스템"
        }))
    ];

    const activities = combinedActivities
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);



    const pendingInvite = await prisma.projectInvite.findFirst({
        where: { projectId: id, status: "PENDING" },
        include: { agency: { select: { email: true, name: true } } }
    });

    return (
        <DashboardRoleView
            project={{
                id: project.id,
                name: project.name,
                description: project.description || '',
                healthScore: project.healthScore,
                agencyId: project.agencyId,
                pendingInvite: pendingInvite ? {
                    email: pendingInvite.agency.email,
                    name: pendingInvite.agency.name
                } : null,
                scopeDocs: p.scopeDocs.map((doc: any) => ({
                    id: doc.id,
                    title: doc.title,
                    contentUrl: doc.contentUrl,
                    createdAt: doc.createdAt
                })),
                githubRepoUrl: project.githubRepoUrl
            }}
            stats={{
                totalFeatures,
                completedFeatures,
                inProgressFeatures,
                progress,
                pendingDecisions,
                riskScore,
                recentUpdates: p.updates.length,
                latestAiSummary,
                activities,
                nextMilestoneDate,
                nextMilestone: nextMilestone ? {
                    id: nextMilestone.id,
                    title: nextMilestone.title,
                    description: nextMilestone.description,
                    status: nextMilestone.status
                } : null
            }}
        />
    );
}
