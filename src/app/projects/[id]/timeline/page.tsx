import prisma from "@/lib/prisma";
import { Clock, AlertTriangle, CalendarDays, Flag, ChevronRight, Activity, Map, CheckCircle2, Play } from "lucide-react";
import { TimelineActions, InteractiveMilestone, InteractiveGanttBar } from "./TimelineClient";


export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const project = await prisma.project.findUnique({
        where: { id },
        include: { features: true, milestones: { orderBy: { sortOrder: 'asc' } } }
    });

    if (!project) return <div>프로젝트를 찾을 수 없습니다.</div>;

    // 빈 상태: 기능도 마일스톤도 없을 때
    if (project.features.length === 0 && project.milestones.length === 0) {
        return (
            <div className="max-w-5xl mx-auto py-8 px-4 h-full flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6 max-w-sm mx-auto shadow-inner">
                    <CalendarDays className="w-10 h-10 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-4">아직 일정이 수립되지 않았습니다</h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">개발사가 초기 요구사항을 분석하고 첫 번째 마일스톤(칸반 보드)을 세팅하면 프로젝트 전체 일정표가 자동으로 생성됩니다.</p>
            </div>
        );
    }

    // DB에서 가져온 실제 마일스톤
    const milestones = project.milestones.map((ms) => {
        const isCompleted = ms.status === 'paid';
        const isPending = ms.status === 'pending';
        return {
            id: ms.id,
            title: ms.title,
            date: ms.targetDate ? ms.targetDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : '미정',
            completed: isCompleted,
            isCurrent: isPending,
            desc: ms.description || '',
        };
    });

    // 진행률 계산
    const completedCount = milestones.filter(m => m.completed).length;
    const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;
    // 현재 진행중인 마일스톤 인덱스 (completed 다음 것)
    const currentIndex = milestones.findIndex(m => m.isCurrent);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 space-y-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 text-xs font-bold flex items-center gap-2 border border-blue-500/20 backdrop-blur-md">
                            <CalendarDays className="w-3.5 h-3.5" /> 전체 프로젝트 일정
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">진행 흐름 및 마일스톤</h1>
                    <p className="text-muted-foreground mt-2 text-lg">우리의 프로젝트가 일정대로 잘 진행되고 있는지 간트 차트와 핵심 일정으로 확인하세요.</p>
                </div>
                <TimelineActions projectId={id} />
            </div>

            {/* 1. Milestone Subway Map - DB 기반 */}
            {milestones.length > 0 && (
                <div className="bg-background/80 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
                    <div className="absolute left-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                    <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                        <Map className="w-6 h-6 text-primary" /> 전체 프로젝트 마일스톤 (Milestones)
                    </h2>

                    <div className="flex overflow-x-auto pb-8 pt-4 hide-scrollbar">
                        <div className="relative min-w-[1000px] w-full px-8">
                            {/* Subway Track (Base) */}
                            <div className="absolute top-10 left-8 right-8 h-3 bg-muted rounded-full border border-border/50 shadow-inner" />

                            {/* Subway Track (Progress) */}
                            <div className="absolute top-10 left-8 h-3 bg-gradient-to-r from-blue-500 via-primary to-emerald-500 rounded-full z-0 transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progressPercent}%` }}>
                                {/* Train Marker at the end of progress */}
                                <div className="absolute -right-4 -top-3.5 w-10 h-10 bg-background border-4 border-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce z-20">
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                </div>
                            </div>

                            <div className="relative z-10 flex justify-between mt-2">
                                {milestones.map((ms, i) => (
                                    <InteractiveMilestone key={ms.id} title={ms.title} complete={ms.completed} projectId={id} milestoneId={ms.id}>
                                        <div className="flex flex-col items-center group cursor-pointer w-32 text-center transition-transform hover:-translate-y-2">
                                            <div className="mb-4 text-xs font-bold text-muted-foreground bg-background/50 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border/50 shadow-sm opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 relative">
                                                {ms.date}
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-background border border-border/50 rotate-45" />
                                            </div>

                                            {/* Station Node */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 shadow-sm transition-all duration-300 z-10
                                                ${ms.completed ? 'bg-background border-primary shadow-primary/20' : 'bg-muted border-muted-foreground/30'}
                                                ${ms.isCurrent ? 'ring-4 ring-emerald-500/20 border-emerald-500 bg-emerald-50 shadow-lg scale-125' : ''}
                                                group-hover:shadow-xl
                                            `}>
                                                {ms.completed && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                {ms.isCurrent && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />}
                                            </div>

                                            <div className={`mt-5 font-bold text-[15px] leading-tight transition-colors ${ms.completed || ms.isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{ms.title}</div>
                                            <div className="text-xs text-muted-foreground mt-1.5 font-medium px-2 bg-muted/30 rounded py-0.5">{ms.desc}</div>
                                        </div>
                                    </InteractiveMilestone>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* 2. Feature Worklist — Gantt Chart */}
            {project.features.length > 0 && (
                <div className="bg-background/80 backdrop-blur-2xl border border-border/50 rounded-[2rem] p-6 lg:p-8 shadow-sm flex flex-col h-[550px] relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10" />
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-blue-500" /> 세부 기능 제작 현황 (대시보드 일정표)
                    </h2>

                    <div className="border border-border/50 rounded-2xl flex-1 overflow-x-auto overflow-y-auto relative bg-background/50 backdrop-blur-xl flex flex-col shadow-inner">
                        {/* Chart Header - 동적 주차 생성 */}
                        <div className="flex border-b border-border/50 bg-muted/40 sticky top-0 z-30 min-w-[900px] backdrop-blur-md">
                            <div className="w-72 flex-shrink-0 p-4 border-r border-border/50 font-bold text-sm text-muted-foreground flex items-center bg-muted/40">
                                기능 (Features)
                            </div>
                            <div className="flex-1 flex min-w-[700px]">
                                {generateWeekHeaders().map((week, idx) => (
                                    <div key={week.label} className={`flex-1 p-3 border-r border-border/20 text-center flex flex-col items-center justify-center ${week.isCurrent ? 'bg-primary/5' : ''}`}>
                                        <span className={`text-xs font-bold ${week.isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{week.label}</span>
                                        {week.isCurrent && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 rounded mt-1">This Week</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chart Rows */}
                        <div className="flex-1 min-w-[900px]">
                            {project.features.map((feature, idx) => {
                                const leftPercent = Math.min(idx * 12, 60);
                                const widthPercent = Math.max(15, 20 + (idx % 3) * 8);
                                const isOverdue = feature.status === 'blocked';
                                const isDone = feature.status === 'done';

                                return (
                                    <div key={feature.id} className="flex border-b border-border/20 group hover:bg-muted/30 transition-colors relative z-0">
                                        <div className="w-72 flex-shrink-0 p-4 border-r border-border/50 flex flex-col justify-center gap-1 bg-background/90 sticky left-0 z-20 group-hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-success' : (isOverdue ? 'bg-destructive' : 'bg-primary')}`} />
                                                <span className="text-sm font-bold truncate">{feature.name}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground bg-muted/50 w-max px-1.5 py-0.5 rounded ml-4">{feature.progressPercentage}% 완료</span>
                                        </div>
                                        <div className="flex-1 relative py-3 px-1 min-w-[700px] flex items-center">
                                            {/* Background Grid Lines */}
                                            <div className="absolute inset-0 flex pointer-events-none z-0">
                                                {[1, 2, 3, 4, 5, 6, 7].map((i, rIdx) => <div key={i} className={`flex-1 border-r border-border/10 ${rIdx === getCurrentWeekIndex() ? 'bg-primary/5' : ''}`} />)}
                                            </div>

                                            {/* The Gantt Bar */}
                                            <InteractiveGanttBar
                                                title={feature.name}
                                                projectId={id}
                                                featureId={feature.id}
                                                className={`h-8 rounded-lg shadow-sm relative flex items-center px-3 overflow-hidden cursor-pointer hover:brightness-110 transition-all hover:scale-y-110 z-10
                                                    ${isDone ? 'bg-success/80 text-white' : (isOverdue ? 'bg-destructive/80 text-white border border-destructive' : 'bg-gradient-to-r from-primary to-blue-500 text-white shadow-primary/20')}
                                                `}
                                                style={{ marginLeft: `${leftPercent}%`, width: `${widthPercent}%` }}
                                            >
                                                <span className="text-[11px] font-bold truncate whitespace-nowrap drop-shadow-md">
                                                    {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" />}
                                                    {feature.name}
                                                </span>
                                            </InteractiveGanttBar>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// 현재 날짜 기준 동적으로 7주 생성
function generateWeekHeaders(): { label: string; isCurrent: boolean }[] {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // 이번 주 시작

    // 3주 전부터 시작
    const startDate = new Date(currentWeekStart);
    startDate.setDate(startDate.getDate() - 21);

    const weeks = [];
    for (let i = 0; i < 7; i++) {
        const weekDate = new Date(startDate);
        weekDate.setDate(startDate.getDate() + i * 7);
        const month = weekDate.getMonth() + 1;
        const weekNum = Math.ceil(weekDate.getDate() / 7);
        const isCurrent = i === 3; // 4번째가 현재 주
        weeks.push({ label: `${month}월 ${weekNum}주`, isCurrent });
    }
    return weeks;
}

function getCurrentWeekIndex(): number {
    return 3; // generateWeekHeaders에서 4번째(index 3)가 현재 주
}
