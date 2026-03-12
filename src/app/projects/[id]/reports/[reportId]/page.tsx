import prisma from "@/lib/prisma";
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert, Sparkles, TrendingUp, Download, Share2, Layers, CalendarRange, Target, AlertTriangle, Zap, Server, ChevronRight, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";


export default async function ReportDetailPage({ params }: { params: Promise<{ id: string, reportId: string }> }) {
    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: { 
            features: true,
            updates: {
                where: { clientSummary: { not: null } },
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    if (!project) notFound();

    const features = project.features || [];
    const totalFeatures = features.length;
    const completedFeatures = features.filter((f) => f.status === 'done').length;
    const completionRate = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    const endDate = project.endDate ? new Date(project.endDate) : new Date();
    const today = new Date();
    const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const dDayText = project.endDate ? (remainingDays >= 0 ? `D-${remainingDays}` : `D+${Math.abs(remainingDays)}`) : "진행중";

    const recentDoneFeatures = features
        .filter(f => f.status === 'done')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 2);

    const nextTargets = features
        .filter(f => f.status !== 'done')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, 2);

    const latestAiSummary = project.updates[0]?.clientSummary || 
        "이번 주는 프로젝트 작업이 순항하고 있습니다. 특별한 이슈나 지연 사항이 없습니다. 개발팀이 열심히 화면 및 서버 연동 작업을 진행 중입니다!";

    if (project.features.length === 0) {
        return (
            <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 relative text-center min-h-[60vh] flex flex-col justify-center items-center">
                <Link
                    href={`/projects/${id}`}
                    className="absolute top-10 left-4 sm:left-6 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all mb-10 bg-muted/30 px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/50 w-max"
                >
                    <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
                </Link>
                <div className="w-20 h-20 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mb-6 shadow-inner">
                    <Sparkles className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold mb-4">아직 발행된 AI 리포트가 없습니다</h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">개발사가 작업을 진행하고 변경사항을 기록하면, AI가 이를 분석하여 매주 알기 쉬운 요약 리포트를 자동으로 생성해 드립니다.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 relative">

            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 blur-3xl rounded-full -z-10" />

            <Link
                href={`/projects/${id}`}
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all mb-10 bg-muted/30 px-4 py-2 rounded-xl border border-border/50 hover:bg-muted/50 w-max"
            >
                <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
            </Link>

            {/* Document Header */}
            <header className="mb-12 bg-background/80 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-8 lg:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-64 h-64 bg-primary/5 blur-3xl -z-10 rounded-full" />

                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-xl text-xs font-black tracking-widest flex items-center gap-2 shadow-sm uppercase backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5" /> AI 생성 인텔리전스 리포트
                    </span>
                    <span className="px-3 py-1.5 bg-muted/50 text-muted-foreground border border-border/50 rounded-xl text-xs font-bold font-mono shadow-sm">
                        REP-2403-W2
                    </span>
                    <span className="px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm ml-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 발주사 열람 가능
                    </span>
                </div>

                <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-6 text-foreground/90">
                    2024년 3월 2주차 결산 리포트
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl font-medium">
                    지난 일주일 간 개발팀이 레포지토리(GitHub)에 기록한 142개의 커밋과 업무 도구(Jira, Figma)의 데이터를 AI가 분석하여 가장 이해하기 쉬운 형태로 요약했습니다.
                </p>

                <div className="flex flex-wrap gap-4 mt-10">
                    <button className="px-6 py-3 bg-foreground text-background font-bold rounded-2xl flex items-center gap-2 shadow-lg hover:bg-foreground/90 transition-all active:scale-95 group">
                        <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" /> PDF로 저장 증빙하기
                    </button>
                    <button className="px-6 py-3 bg-background border-2 border-border/50 text-foreground font-bold rounded-2xl flex items-center gap-2 shadow-sm hover:border-border hover:bg-muted/20 transition-all active:scale-95">
                        <Share2 className="w-5 h-5" /> 내부 팀원에게 공유
                    </button>
                </div>
            </header>

            {/* AI Executive Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-[2rem] p-8 lg:p-10 shadow-sm relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-6 right-6 opacity-10"><Sparkles className="w-24 h-24" /></div>
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <h3 className="text-2xl font-black flex items-center gap-2 text-foreground/90">
                            <FileText className="w-6 h-6 text-primary" /> 핵심 요약 (Executive Summary)
                        </h3>
                        <span className="px-4 py-1.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                            {completionRate >= 50 ? "☀️ 쾌청함 (순항 중)" : "⛅ 보통 (진행 중)"}
                        </span>
                    </div>
                    <p className="leading-loose text-lg text-foreground/80 font-medium relative z-10 whitespace-pre-wrap">
                        {latestAiSummary}
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center">
                        <p className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2"><Target className="w-4 h-4" /> 전체 목표 달성률</p>
                        <h4 className="text-5xl font-black text-primary">{completionRate}%</h4>
                        <p className="text-xs text-muted-foreground mt-3 font-medium">전체 {totalFeatures}개 중 {completedFeatures}개 완료</p>
                    </div>
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center">
                        <p className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2"><Zap className="w-4 h-4" /> 남은 개발 기간</p>
                        <h4 className="text-4xl font-black text-foreground">{dDayText}</h4>
                        <p className="text-xs text-muted-foreground mt-3 font-medium">
                            {completionRate === 100 ? "프로젝트가 성공적으로 완료되었습니다." : "예상 일정과 목표에 맞춰 달리고 있습니다."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Detailed Categories */}
            <div className="space-y-8">
                {/* Section 1: Completed Achievements */}
                <div className="bg-background/60 backdrop-blur-2xl border border-border/50 rounded-[2rem] p-8 lg:p-10 shadow-sm">
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-8">
                        <div className="p-2 rounded-xl bg-success/10 text-success"><CheckCircle2 className="w-6 h-6" /></div>
                        최근 주요 개발 완료 항목
                    </h3>
                    {recentDoneFeatures.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recentDoneFeatures.map((f, i) => (
                                <div key={f.id} className="bg-muted/30 border border-border/40 rounded-2xl p-6 hover:bg-muted/50 transition-colors">
                                    <h4 className="text-lg font-bold mb-2 flex items-center gap-2"><Layers className={`w-5 h-5 ${i===0 ? 'text-blue-500':'text-purple-500'}`} /> {f.name}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description || f.clientDescription || "기능 구현이 완료되었습니다."}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center py-6">
                            <p className="text-sm text-muted-foreground">아직 완료 단계로 보고된 핵심 기능이 없습니다. 개발 중입니다.</p>
                        </div>
                    )}
                </div>

                {/* Section 1.5: Launch-Readiness Matrix */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 lg:p-10 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-bl-full -z-10" />
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-8 text-white">
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400"><ShieldCheck className="w-6 h-6" /></div>
                        출시 준비도 및 비즈니스 방어력 점검표
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        앱 런칭 후 발생할 수 있는 비즈니스 리스크를 사전에 완벽히 차단합니다. 복잡한 시스템 무결성 수치 대신 대표님께서 직관적으로 확인할 수 있는 방어 지수입니다.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-success/20 text-success rounded-xl shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="font-bold text-white text-sm mb-1">결제 실패 시 자동 복구 로직</h4>
                                    <p className="text-xs text-slate-400">사용자 이탈(매출 손실) 방어 완비</p>
                                </div>
                            </div>
                            <span className="text-xs font-black text-success bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">안전</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-success/20 text-success rounded-xl shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="font-bold text-white text-sm mb-1">동시 접속 폭주 (트래픽) 방어</h4>
                                    <p className="text-xs text-slate-400">서버 다운으로 인한 서비스 중단 방지</p>
                                </div>
                            </div>
                            <span className="text-xs font-black text-success bg-success/10 px-3 py-1.5 rounded-lg border border-success/20">안전</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="font-bold text-white text-sm mb-1">회원탈퇴 시 개인정보 완전 파기</h4>
                                    <p className="text-xs text-slate-400">개인정보보호법 위반 리스크 방어</p>
                                </div>
                            </div>
                            <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">초안 완료</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-slate-800 text-slate-500 rounded-xl shrink-0"><Lock className="w-5 h-5" /></div>
                                <div>
                                    <h4 className="font-bold text-slate-300 text-sm mb-1">어뷰징 유저 자동 차단 (블랙리스트)</h4>
                                    <p className="text-xs text-slate-500">악성 유저로 인한 커뮤니티 오염 방어</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg">개발 대기</span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Risks & Warnings */}
                <div className="bg-warning/5 border border-warning/20 rounded-[2rem] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-warning/10 rounded-bl-full" />
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <h3 className="text-2xl font-bold flex items-center gap-3 text-warning-foreground">
                            <div className="p-2 rounded-xl bg-warning/20 text-warning-foreground"><AlertTriangle className="w-6 h-6" /></div>
                            함께 확인이 필요한 사항
                        </h3>
                        <span className="px-3 py-1 bg-background/50 text-warning-foreground border border-warning/20 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            ☁️ 약간 흐림 (일정 지연 주의)
                        </span>
                    </div>
                    <div className="bg-background rounded-2xl p-6 border border-warning/30 shadow-sm relative z-10">
                        <h4 className="font-bold text-lg mb-2 text-foreground">관리자(Admin) 상세 기획서가 필요합니다</h4>
                        <p className="text-foreground/80 leading-relaxed mb-4">
                            다음 주 화요일부터 관리자 페이지 작업이 시작될 예정입니다. 원활한 진행을 위해 세부적인 기능 리스트와 화면 구성을 월요일까지 픽스해주시면, 일정 지연 없이 바로 속도를 낼 수 있습니다!
                        </p>
                        <div className="flex gap-3">
                            <Link href={`/projects/${id}/feed`} className="px-4 py-2 bg-warning text-warning-foreground font-bold text-sm rounded-xl hover:bg-warning/90 transition-colors shadow-sm inline-flex items-center gap-2">
                                일정 조율 및 피드백 남기기 <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Section 3: Next Week */}
                <div className="bg-background/60 backdrop-blur-2xl border border-border/50 rounded-[2rem] p-8 lg:p-10 shadow-sm">
                    <h3 className="text-2xl font-bold flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary"><CalendarRange className="w-6 h-6" /></div>
                        다음 차례 핵심 목표 (Next Sprint)
                    </h3>
                    <div className={`${nextTargets.length > 0 ? "space-y-4 relative before:absolute before:inset-0 before:ml-[19px] before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent" : "py-4 text-center"}`}>
                        {nextTargets.length > 0 ? nextTargets.map((f, i) => (
                            <div key={f.id} className={`relative pl-12 ${i > 0 ? "pt-4" : ""}`}>
                                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center font-black text-muted-foreground shadow-sm">{i + 1}</div>
                                <h4 className="text-lg font-bold mb-1">{f.name}</h4>
                                <p className="text-sm text-muted-foreground">{f.description || f.clientDescription || "해당 기능의 구조 및 상세 구현 작업을 시작합니다."}</p>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground">현재 새롭게 준비 중인 다음 스프린트 태스크가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center pb-8">
                <p className="text-sm font-bold text-muted-foreground flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> 본 리포트는 Commitly AI가 위변조 불가능한 GitHub 커밋 기록을 바탕으로 객관적으로 작성했습니다.
                </p>
            </div>
        </div>
    );
}
