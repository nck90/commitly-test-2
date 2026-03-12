import prisma from "@/lib/prisma";
import { ArrowLeft, Target, Layers, Scale, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { detectRisks } from "@/lib/riskEngine";

export default async function MetricsDetailPage({ params }: { params: Promise<{ id: string, type: string }> }) {
    const { id, type } = await params;

    if (!['progress', 'features', 'pending', 'risk'].includes(type)) {
        notFound();
    }

    const project = await prisma.project.findUnique({
        where: { id }
    });

    if (!project) notFound();

    // Fetch actual data
    const features = await prisma.feature.findMany({
        where: { projectId: id },
        orderBy: { updatedAt: 'desc' }
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedFeatures = features.filter(f => f.status === 'done' && f.updatedAt >= oneWeekAgo);

    const pendingDecisions = await prisma.decision.findMany({
        where: { projectId: id, status: 'pending' },
        orderBy: { createdAt: 'desc' }
    });

    const dbRisks = await prisma.risk.findMany({
        where: { projectId: id, status: 'open' },
        orderBy: { createdAt: 'desc' }
    });
    
    // Auto-detected risks from the AI engine
    const engineRisks = await detectRisks(id);
    const risks = [...dbRisks, ...engineRisks];

    const getMetricsData = () => {
        switch (type) {
            case 'progress':
                return {
                    title: "전체 개발 진행률 세부 정보",
                    icon: <Target className="w-8 h-8 text-primary" />,
                    bg: "bg-primary/5",
                    color: "text-primary",
                    items: features.length > 0 ? features.map(f => ({
                        title: f.name,
                        status: f.status === 'done' ? '완료' : f.status === 'in-progress' ? '진행중' : '시작 전',
                        date: f.updatedAt.toLocaleDateString(),
                        percentage: f.progressPercentage
                    })) : []
                };
            case 'features':
                return {
                    title: "이번 주 완료된 기능 목록",
                    icon: <Layers className="w-8 h-8 text-success" />,
                    bg: "bg-success/5",
                    color: "text-success",
                    items: completedFeatures.length > 0 ? completedFeatures.map(f => ({
                        title: f.name,
                        status: "완료",
                        date: f.updatedAt.toLocaleDateString(),
                        percentage: 100
                    })) : []
                };
            case 'pending':
                return {
                    title: "클라이언트 결정 대기 안건",
                    icon: <Scale className="w-8 h-8 text-warning" />,
                    bg: "bg-warning/5",
                    color: "text-warning",
                    items: pendingDecisions.length > 0 ? pendingDecisions.map(d => ({
                        title: d.title,
                        status: "결정 대기",
                        date: d.createdAt.toLocaleDateString(),
                        percentage: 0
                    })) : []
                };
            case 'risk':
                return {
                    title: "감지된 위험 요소",
                    icon: <ShieldAlert className="w-8 h-8 text-destructive" />,
                    bg: "bg-destructive/5",
                    color: "text-destructive",
                    items: risks.length > 0 ? risks.map(r => ({
                        title: r.title,
                        status: r.severity === 'high' ? '위험' : '경고',
                        date: (r as any).createdAt instanceof Date ? (r as any).createdAt.toLocaleDateString() : (new Date((r as any).createdAt)).toLocaleDateString(),
                        percentage: 0
                    })) : []
                };
            default: return null;
        }
    }

    const data = getMetricsData();
    if (!data) return null;

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
            <Link
                href={`/projects/${id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
            </Link>

            <header className="mb-12 flex items-center gap-6">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner border border-white/10 ${data.bg}`}>
                    {data.icon}
                </div>
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                        {data.title}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        해당 지표의 세부 항목과 진행 상황을 확인할 수 있습니다.
                    </p>
                </div>
            </header>

            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-8 border-b border-border/50 bg-muted/20">
                    <h2 className="text-xl font-bold">세부 항목 리스트</h2>
                </div>

                <div className="divide-y divide-border/30">
                    {data.items.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold mb-1">항목이 없습니다</h3>
                            <p className="text-sm">현재 조건에 해당하는 데이터가 존재하지 않습니다.</p>
                        </div>
                    ) : (
                        data.items.map((item, i) => (
                        <div key={i} className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${item.percentage === 100 ? 'bg-success/10 text-success' :
                                    item.percentage > 0 ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                                    }`}>
                                    {item.percentage === 100 ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 w-full">
                                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                                    <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                                        <span className={`px-2 py-0.5 rounded-md border text-xs uppercase tracking-wider ${item.percentage === 100 ? 'bg-success/5 border-success/20 text-success' :
                                            item.percentage > 0 ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-warning/5 border-warning/20 text-warning'
                                            }`}>
                                            {item.status}
                                        </span>
                                        <span>•</span>
                                        <span className="font-mono">{item.date}</span>
                                    </div>
                                </div>
                            </div>

                            {type === 'progress' && (
                                <div className="w-full sm:w-64 shrink-0 flex items-center gap-4">
                                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full rounded-full ${item.percentage === 100 ? 'bg-success' : 'bg-primary'}`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                    <span className="font-bold font-mono text-sm min-w-12 text-right">{item.percentage}%</span>
                                </div>
                            )}

                            {(type === 'pending' || type === 'risk') && (
                                <Link href={`/projects/${id}/feed`} className="shrink-0 px-5 py-2.5 bg-background border border-border/50 shadow-sm rounded-xl text-sm font-bold hover:bg-muted active:scale-95 transition-all">
                                    {type === 'pending' ? '검토하러 가기' : '피드백 응답하기'}
                                </Link>
                            )}
                        </div>
                    )))}
                </div>
            </div>
        </div>
    );
}
