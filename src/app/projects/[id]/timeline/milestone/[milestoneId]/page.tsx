import { ArrowLeft, CheckCircle2, Clock, AlignLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function MilestoneDetailPage({ params }: { params: Promise<{ id: string, milestoneId: string }> }) {
    const { id, milestoneId } = await params;

    // DB에서 실제 마일스톤 조회
    const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId }
    });

    if (!milestone || milestone.projectId !== id) notFound();

    const isCompleted = milestone.status === 'paid';
    const isPending = milestone.status === 'pending';
    const dateStr = milestone.targetDate 
        ? milestone.targetDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
        : '미정';

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
            <Link
                href={`/projects/${id}/timeline`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-12"
            >
                <ArrowLeft className="w-4 h-4" /> 타임라인으로 돌아가기
            </Link>

            <header className="mb-12 text-center md:text-left">
                <div className={`inline-flex items-center justify-center p-4 rounded-3xl mb-6 shadow-sm ${isCompleted ? 'bg-success/10 text-success' : isPending ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                    {isCompleted ? <CheckCircle2 className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-3">
                            {milestone.title}
                        </h1>
                        <p className="text-lg text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                            <CalendarDays className="w-5 h-5" />
                            예정일: <span className="font-bold text-foreground">{dateStr}</span>
                            <span className="mx-2 text-border">|</span>
                            <span className={`font-bold ${isCompleted ? 'text-success' : isPending ? 'text-primary' : 'text-muted-foreground'}`}>
                                {isCompleted ? '완료됨' : isPending ? '진행 중' : '진행 예정'}
                            </span>
                        </p>
                    </div>
                </div>
            </header>

            <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isCompleted ? 'bg-success' : 'bg-primary'}`} />

                <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <AlignLeft className="w-6 h-6 text-primary" /> 마일스톤 상세 정보
                </h2>

                <div className="space-y-6">
                    {milestone.description && (
                        <div className="p-5 rounded-2xl border border-border/50 bg-background shadow-sm">
                            <h3 className="font-bold text-base mb-2">설명</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
                        </div>
                    )}

                    {milestone.amount > 0 && (
                        <div className="p-5 rounded-2xl border border-border/50 bg-background shadow-sm">
                            <h3 className="font-bold text-base mb-2">관련 금액</h3>
                            <p className="text-2xl font-black text-foreground">₩{milestone.amount.toLocaleString()}</p>
                        </div>
                    )}

                    {!milestone.description && milestone.amount === 0 && (
                        <div className="p-8 rounded-2xl border border-dashed border-border/50 bg-background text-center">
                            <p className="text-sm text-muted-foreground">아직 이 마일스톤에 대한 상세 정보가 등록되지 않았습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
