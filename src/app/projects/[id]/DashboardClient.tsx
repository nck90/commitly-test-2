"use client";

import { useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useTour } from "@/contexts/TourContext";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    Download, FileText, CheckCircle2, Clock, AlertTriangle, MessageSquare,
    Target, Layers, Scale, Activity, RefreshCw, FileCheck, ArrowRight,
    Code2, GitCommit, GitPullRequest, Flame, TrendingUp, Zap, BarChart3,
    ListChecks, Send, Eye, ShieldCheck, CalendarCheck, Users, Star,
    Wallet, TrendingDown, Sparkles, Cpu, PieChart, MonitorPlay, Languages, Lock,
    PlusCircle, PlayCircle, HelpCircle, MousePointerClick, UserPlus, Mail, Bell, Upload, Loader2, X
} from "lucide-react";
import { analyzeProjectDocuments } from "@/app/actions/aiExtraction";
import { uploadProjectDocuments } from "@/app/actions/project";

interface DashboardProject {
    id: string;
    name: string;
    description: string;
    healthScore: number;
    agencyId?: string | null;
    scopeDocs?: {
        id: string;
        title: string;
        contentUrl: string | null;
        createdAt: Date;
    }[];
    pendingInvite?: { email: string, name: string | null } | null;
    githubRepoUrl?: string | null;
}

interface DashboardStats {
    totalFeatures: number;
    completedFeatures: number;
    inProgressFeatures: number;
    progress: number;
    pendingDecisions: number;
    riskScore: number;
    recentUpdates: number;
    latestAiSummary: string;
    activities: any[];
    nextMilestoneDate?: Date | null;
    nextMilestone?: {
        id: string;
        title: string;
        description: string;
        status: string;
    } | null;
}



// ─────────────── MAIN ROLE VIEW ───────────────
export function DashboardRoleView({ project, stats }: { project: DashboardProject; stats: DashboardStats }) {
    const { role } = useAuth();
    const hasFeatures = stats.totalFeatures > 0;
    
    // 이 프로젝트가 '새 프로젝트(잠금 상태)'인지 여부는 기능 정의 유무로 판단
    const isLocked = !hasFeatures;

    if (role === "developer") {
        if (isLocked) return <EmptyDeveloperDashboard project={project} />;
        return <DeveloperDashboard project={project} stats={stats} isFirstVisit={false} />;
    }

    // 클라이언트: 기능이 없으면 무조건 문서 업로드 유도 화면
    if (isLocked) return <EmptyClientDashboard project={project} stats={stats} />;
    return <ClientDashboard project={project} stats={stats} />;
}

// ═══════════════════════════════════════════════
//  EMPTY DASHBOARDS (NEW PROJECTS)
// ═══════════════════════════════════════════════
function EmptyClientDashboard({ project, stats }: { project: DashboardProject; stats: DashboardStats }) {
    const router = useRouter();
    const { startTour, isTourActive } = useTour();

    const [files, setFiles] = useState<File[]>([]);
    const [contractText, setContractText] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [aiAnalyzed, setAiAnalyzed] = useState(false);
    
    const [parsedFeatures, setParsedFeatures] = useState<string[]>([]);
    const [parsedMilestones, setParsedMilestones] = useState<{title: string, description: string, weekOffset: number}[]>([]);
    const [saving, setSaving] = useState(false);

    const hasDocuments = files.length > 0 || contractText.trim().length > 0;

    useEffect(() => {
        const onboardingDone = localStorage.getItem("commitly_onboarding_done");
        if (!isTourActive && !onboardingDone) {
            const timer = setTimeout(() => {
                startTour(project.id, "client");
                localStorage.setItem("commitly_onboarding_done", "true");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isTourActive, project.id, startTour]);

    const handleAnalyze = async () => {
        if (!hasDocuments) {
            toast.error("분석할 문서를 업로드하거나 텍스트를 입력해주세요.");
            return;
        }

        setAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append("text", contractText);
            files.forEach(file => formData.append("files", file));

            const result = await analyzeProjectDocuments(formData);
            
            if (result.features) setParsedFeatures(result.features);
            if (result.milestones && result.milestones.length > 0) setParsedMilestones(result.milestones);
            
            setAiAnalyzed(true);
            toast.success("AI 분석이 완료되었습니다!", {
                description: "기능 목록과 마일스톤이 추출되었습니다. 내용을 확인하고 승인해주세요."
            });
        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            toast.error("AI 분석 중 오류가 발생했습니다: " + (error.message || "다시 시도해 주세요."));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApprove = async () => {
        if (parsedFeatures.length === 0) {
            toast.warning("문서 분석 내용이 부족합니다. 기능이 추출되지 않아 대시보드를 열 수 없습니다.");
            setAiAnalyzed(false);
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("projectId", project.id);
            formData.append("document", contractText);

            files.forEach((file) => {
                formData.append("files", file);
            });
            if (parsedFeatures.length > 0) {
                formData.append("parsedFeatures", JSON.stringify(parsedFeatures));
            }
            if (parsedMilestones.length > 0) {
                formData.append("parsedMilestones", JSON.stringify(parsedMilestones));
            }

            await uploadProjectDocuments(formData);
            toast.success("승인 완료! 대시보드가 열렸습니다.");
            router.refresh();
        } catch (err: any) {
            toast.error("저장 오류: " + err.message);
            setSaving(false);
        }
    };

    if (saving) {
        return (
            <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center text-center space-y-6">
                 <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-primary/20 animate-ping" />
                    <div className="relative w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                        <Loader2 className="w-10 h-10 animate-spin" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold">프로젝트를 설정하고 있습니다...</h2>
                <p className="text-muted-foreground">대시보드를 준비 중입니다. 잠시만 기다려주세요.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pt-10 pb-20">
            <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                    <Lock className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight">
                    프로젝트 대시보드가 잠겨있습니다
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                    프로젝트가 생성되었지만, 개발의 기준이 되는 기능(Feature)이 아직 없습니다. 개발 팀이 작업을 시작할 수 있도록 기획서를 업로드하고 AI 분석을 진행해주세요.
                </p>
            </div>

            <div className="bg-background border border-border/50 rounded-[2rem] p-8 shadow-sm max-w-2xl mx-auto">
                {!aiAnalyzed ? (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold mb-2">기획서 직접 업로드</h2>
                            <p className="text-muted-foreground text-sm">기획서나 요구사항 문서를 올리면 AI가 분석하여 프로젝트의 기반을 다집니다.</p>
                        </div>

                        {analyzing ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-6 bg-accent/30 rounded-2xl border border-border/50">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                        <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-bold">AI가 문서를 분석 중입니다</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">기능 목록 추출 중... 잠시만 기다려주세요.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div 
                                    className="w-full border-2 border-dashed border-primary/30 hover:border-primary transition-colors rounded-xl p-6 flex flex-col items-center justify-center bg-primary/5 cursor-pointer relative"
                                    onClick={() => document.getElementById("dashboard-file-upload")?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                                        }
                                    }}
                                >
                                    <input 
                                        id="dashboard-file-upload" 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        onChange={(e) => {
                                            if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                        }}
                                    />
                                    <Upload className="w-8 h-8 text-primary mb-3" />
                                    <p className="text-sm font-bold text-foreground">클릭하거나 파일을 드래그하여 업로드</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, 이미지, 텍스트 문서 지원</p>
                                </div>

                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        {files.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                                                <span className="text-sm font-medium text-foreground truncate max-w-[80%]">{file.name}</span>
                                                <button 
                                                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                                                    className="text-muted-foreground hover:text-destructive p-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-border"></div>
                                    <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase font-semibold">또는 직접 텍스트 입력</span>
                                    <div className="flex-grow border-t border-border"></div>
                                </div>

                                <textarea
                                    value={contractText}
                                    onChange={(e) => setContractText(e.target.value)}
                                    className="w-full h-24 commitly-input p-4 resize-none"
                                    placeholder="기획 내용 메모를 여기에 적어주세요."
                                />

                                <button 
                                    onClick={handleAnalyze}
                                    disabled={!hasDocuments}
                                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 flex justify-center items-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    AI 분석 시작하기
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in zoom-in-95">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">분석 완료 및 승인 대기</h2>
                            <p className="text-muted-foreground text-sm">업로드하신 문서를 바탕으로 다음 기능 목록과 마일스톤이 추출되었습니다. 승인하시면 대시보드가 설정됩니다.</p>
                        </div>

                        <div className="bg-accent/50 p-5 rounded-xl border border-border/50">
                             <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                                <ListChecks className="w-4 h-4 text-primary" /> 
                                추출된 핵심 기능 ({parsedFeatures.length}개)
                            </h4>
                            {parsedFeatures.length > 0 ? (
                                <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {parsedFeatures.map((feat, i) => (
                                        <li key={i} className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0 text-foreground flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg flex items-center gap-2 mb-4">
                                    <AlertTriangle className="w-4 h-4" />
                                    의미 있는 기능 목록을 추출하지 못했습니다. 다시 분석해 주세요.
                                </p>
                            )}
                            
                            {parsedMilestones.length > 0 && (
                                <>
                                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3 mt-4">
                                        <Target className="w-4 h-4 text-primary" /> 
                                        예상 마일스톤 ({parsedMilestones.length}단계)
                                    </h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {parsedMilestones.map((ms, i) => (
                                            <div key={i} className="p-3 bg-background rounded-lg border border-border/50 flex flex-col gap-1">
                                                <span className="text-[13px] font-bold text-foreground leading-tight">{ms.title}</span>
                                                <span className="text-[11px] text-muted-foreground leading-snug break-keep line-clamp-2">{ms.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setAiAnalyzed(false)}
                                className="flex-1 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors"
                            >
                                뒤로 (기록 수정)
                            </button>
                            <button 
                                onClick={handleApprove}
                                disabled={parsedFeatures.length === 0}
                                className="flex-[2] py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            >
                                승인하고 대시보드 열기
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-[2rem] p-8 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                    {project.pendingInvite ? <Mail className="w-6 h-6 animate-bounce" /> : <UserPlus className="w-6 h-6" />}
                </div>
                <h2 className="text-2xl font-bold mb-3">
                    {project.pendingInvite 
                        ? `${project.pendingInvite.name || project.pendingInvite.email} 개발사의 승인을 기다리는 중이에요` 
                        : '파트너 개발사를 초대해보세요'}
                </h2>
                <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
                    {project.pendingInvite 
                        ? '함께할 개발사에게 프로젝트 초대를 보냈습니다. 개발사가 초대를 수락하면 모든 대시보드 기능이 활성화됩니다.'
                        : '문서 분석을 마친 후, 함께 작업할 파트너사를 설정 페이지에서 초대할 수 있습니다.'}
                </p>
                {project.pendingInvite && (
                    <button onClick={() => router.push(`/projects/${project.id}/settings`)} className="px-8 py-3 bg-primary/10 text-primary font-bold rounded-2xl hover:bg-primary/20 transition-colors border border-primary/20">
                         초대 정보 관리
                    </button>
                )}
            </div>
        </div>
    );
}

function EmptyDeveloperDashboard({ project }: { project: DashboardProject }) {
    const router = useRouter();
    const { startTour, isTourActive } = useTour();

    useEffect(() => {
        const onboardingDone = localStorage.getItem("commitly_onboarding_done");

        if (!isTourActive && !onboardingDone) {
            const timer = setTimeout(() => {
                startTour(project.id, "developer");
                localStorage.setItem("commitly_onboarding_done", "true");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isTourActive, project.id, startTour]);

    return (
        <div className="max-w-3xl mx-auto pt-16 pb-20">
            <div className="text-center space-y-6 mb-12">
                <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-3xl bg-orange-400/20 animate-pulse" />
                    <div className="relative w-20 h-20 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Clock className="w-10 h-10" />
                    </div>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                    클라이언트의 기획서를 기다리고 있어요 📄
                </h1>
                <p className="text-muted-foreground text-base max-w-lg mx-auto">
                    프로젝트에 합류가 완료되었습니다! 클라이언트가 프로젝트의 기준이 되는 기획서나 계약 문서를 업로드하고 기능 목록이 확정되면 대시보드가 활성화됩니다.
                </p>
            </div>

            <div className="bg-background/80 backdrop-blur-xl border-2 border-dashed border-orange-400/30 rounded-[2rem] p-10 flex flex-col items-center text-center max-w-lg mx-auto">
                <div className="flex gap-1 mb-6">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>
                <h3 className="text-lg font-bold mb-2">
                    문서 업로드 대기 중...
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                    클라이언트가 기획서를 올리고 프로젝트 피쳐가 설정되면 이 화면이 자동으로 전환됩니다.<br />그동안 프로젝트 설정을 미리 확인해 보세요.
                </p>
                <button
                    onClick={() => router.push(`/projects/${project.id}/settings`)}
                    className="px-6 py-2.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 transition-colors text-sm"
                >
                    프로젝트 설정 보기
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
//  DEVELOPER DASHBOARD
// ═══════════════════════════════════════════════
function DeveloperDashboard({ project, stats, isFirstVisit }: { project: DashboardProject; stats: DashboardStats; isFirstVisit?: boolean }) {
    const router = useRouter();
    const riskScore = stats.riskScore;
    let riskColor = "text-emerald-500";
    let riskBg = "bg-emerald-500/10";
    let riskBorder = "border-emerald-500/20";
    let riskLabel = "안정적 (Healthy)";
    if (riskScore > 30) { riskColor = "text-blue-500"; riskBg = "bg-blue-500/10"; riskBorder = "border-blue-500/20"; riskLabel = "일반적 (Normal)"; }
    if (riskScore > 50) { riskColor = "text-orange-500"; riskBg = "bg-orange-500/10"; riskBorder = "border-orange-500/20"; riskLabel = "주의 (Warning)"; }
    if (riskScore > 80) { riskColor = "text-destructive"; riskBg = "bg-destructive/10"; riskBorder = "border-destructive/20"; riskLabel = "위험 (Critical)"; }

    // 첫 방문 시 기획서 확인 안내 토스트
    useEffect(() => {
        if (isFirstVisit) {
            const notified = sessionStorage.getItem(`dev_first_visit_${project.id}`);
            if (!notified) {
                toast.success("📄 클라이언트가 기획서를 업로드했습니다!", {
                    description: "산출물 보관함에서 기획서와 계약서 내용을 확인해 주세요.",
                    duration: 6000,
                    action: {
                        label: "보관함 가기",
                        onClick: () => router.push(`/projects/${project.id}/documents`),
                    },
                });
                sessionStorage.setItem(`dev_first_visit_${project.id}`, "true");
            }
        }
    }, [isFirstVisit, project.id, router]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 text-xs font-bold flex items-center gap-2 border border-purple-500/20 backdrop-blur-md">
                            <Code2 className="w-3.5 h-3.5" /> Developer Workspace
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">{project.name}</h1>
                    <p className="text-muted-foreground mt-2 text-lg">{project.description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold ${riskBg} ${riskColor} flex items-center gap-2 border ${riskBorder} backdrop-blur-md`}>
                        <Activity className="w-4 h-4" /> {riskLabel}
                    </span>
                    <ExportReportButton />
                </div>
            </div>

            {/* Core KPIs - Glassmorphism UI */}
            <div id="tour-dev-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-5 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl -z-10 rounded-[3rem]" />

                <div onClick={() => router.push(`/projects/${project.id}/metrics/progress`)} className="bg-background/60 backdrop-blur-xl border border-primary/20 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-primary/40 transition-all cursor-pointer group hover:-translate-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Total Progress</p>
                    <h3 className="text-4xl font-black text-foreground">{stats.progress}%</h3>
                    <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000" style={{ width: `${stats.progress}%` }} />
                    </div>
                </div>

                <div onClick={() => router.push(`/projects/${project.id}/metrics/features`)} className="bg-background/60 backdrop-blur-xl border border-success/20 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-success/40 transition-all cursor-pointer group hover:-translate-y-1">
                    <p className="text-xs font-bold text-success uppercase tracking-wider mb-2 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Features Done</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-success">{stats.completedFeatures}</h3>
                        <span className="text-lg text-muted-foreground font-semibold">/ {stats.totalFeatures}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 font-medium">진행 중: {stats.inProgressFeatures}개</p>
                </div>

                <div onClick={() => router.push(`/projects/${project.id}/metrics/pending`)} className="bg-background/60 backdrop-blur-xl border border-warning/20 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-warning/40 transition-all cursor-pointer group hover:-translate-y-1">
                    <p className="text-xs font-bold text-warning uppercase tracking-wider mb-2 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Pending Client</p>
                    <h3 className="text-4xl font-black text-warning">{stats.pendingDecisions}</h3>
                    <p className="text-xs text-muted-foreground mt-3 font-medium">클라이언트 승인 및 피드백 대기</p>
                </div>

                <div onClick={() => router.push(`/projects/${project.id}/metrics/risk`)} className={`bg-background/60 backdrop-blur-xl border ${riskBorder} p-6 rounded-3xl shadow-sm hover:shadow-xl hover:${riskBorder} transition-all cursor-pointer group hover:-translate-y-1`}>
                    <p className={`text-xs font-bold ${riskColor} uppercase tracking-wider mb-2 flex items-center gap-1.5`}><Cpu className="w-3.5 h-3.5" /> AI Risk Score</p>
                    <h3 className={`text-4xl font-black ${riskColor}`}>{riskScore}</h3>
                    <p className="text-xs text-muted-foreground mt-3 font-medium">지연 가능성 분석됨</p>
                </div>
            </div>

            {/* Advanced Engineering Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Burndown Chart Simulation */}
                    <div id="tour-dev-burndown" className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-6"><TrendingDown className="w-5 h-5 text-blue-500" /> Sprint Burndown</h2>
                        <div className="relative h-48 w-full border-l border-b border-border/50 pt-4 pl-4 flex items-end justify-between">
                            {/* SVG Chart Overlay */}
                            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                {/* Ideal line */}
                                <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" className="text-muted opacity-40" strokeWidth="1" strokeDasharray="4 4" />
                                {/* Actual line is hidden or shown flat if no data */}
                                <polyline points="10,10 90,10" fill="none" stroke="#3b82f6" strokeWidth="3" className="drop-shadow-md opacity-20" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-xs text-muted-foreground absolute bottom-[-24px] left-[10%]">Day 1</span>
                            <span className="text-xs text-muted-foreground absolute bottom-[-24px] left-[50%]">Mid</span>
                            <span className="text-xs text-foreground font-bold absolute bottom-[-24px] left-[90%]">Today</span>
                        </div>
                    </div>

                    {/* Developer Commits & PRs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-3xl p-6 flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-600 flex items-center justify-center shrink-0"><GitCommit className="w-7 h-7" /></div>
                            <div>
                                <p className="text-sm font-bold text-muted-foreground mb-1">Weekly Commits</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-3xl font-black text-foreground">0</p>
                                    <span className="text-xs font-bold text-success flex items-center mb-1.5"><TrendingUp className="w-3 h-3 mr-1" />0%</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-3xl p-6 flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0"><GitPullRequest className="w-7 h-7" /></div>
                            <div>
                                <p className="text-sm font-bold text-muted-foreground mb-1">Open PRs / Reviews</p>
                                <div className="flex items-end gap-3">
                                    <p className="text-3xl font-black text-foreground">0 <span className="text-lg text-muted-foreground font-medium">/ 0</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Weekly AI Report Card */}
                    <div id="tour-dev-ai-report" className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm group hover:border-primary/50 transition-all cursor-pointer" onClick={() => router.push(`/projects/${project.id}/reports/latest`)}>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <Sparkles className="w-5 h-5 text-purple-500" /> 주간 AI 분석 요약
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                            "{stats.latestAiSummary}"
                        </p>
                        <div className="flex items-center text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 cursor-pointer">
                            전체 리포트 보기 <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                    </div>

                    {/* Developer Quick Actions */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> 필수 액션</h2>
                        <div className="space-y-3">
                            <button onClick={() => router.push(`/projects/${project.id}/feed`)} className="w-full p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-primary/30 hover:bg-primary/5 flex items-center gap-4 transition-all text-left">
                                <Send className="w-5 h-5 text-primary" />
                                <div><p className="text-sm font-bold">진행 상황 공유</p><p className="text-xs text-muted-foreground">새로운 소식 업데이트</p></div>
                            </button>
                            <button onClick={() => router.push(`/projects/${project.id}/documents`)} className="w-full p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 flex items-center gap-4 transition-all text-left">
                                <FileText className="w-5 h-5 text-emerald-500" />
                                <div><p className="text-sm font-bold">결과물 서류 등록</p><p className="text-xs text-muted-foreground">설계서 및 다큐먼트 업로드</p></div>
                            </button>
                        </div>
                    </div>

                    {/* Developer LIVE Pulse Stream */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl rounded-bl-full" />
                        <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary animate-pulse" /> Live Activity
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 uppercase tracking-wider flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Syncing</span>
                        </h2>
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-primary/50 before:via-border/50 before:to-transparent">
                            {stats.activities.length > 0 ? stats.activities.map((act, idx) => (
                                <div key={act.id} className={`relative pl-8 ${idx > 0 ? 'opacity-70' : ''}`}>
                                    <div className={`absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-background border-2 ${idx === 0 ? 'border-primary ring-4 ring-primary/20' : 'border-primary'}`} />
                                    <p className="text-sm font-bold">{act.title}</p>
                                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: ko })} · Platform
                                    </p>
                                </div>
                            )) : (
                                <p className="text-xs text-muted-foreground text-center py-4">활동 기록이 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
//  CLIENT DASHBOARD — 완전히 개편된 프리미엄 뷰
// ═══════════════════════════════════════════════
function ClientDashboard({ project, stats }: { project: DashboardProject; stats: DashboardStats }) {
    const router = useRouter();
    const [showTechWords, setShowTechWords] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

    const handleMilestoneSignoff = async () => {
        if (!stats.nextMilestone) return;
        setIsSigning(true);
        try {
            // Update milestone status in DB
            const milestoneRes = await fetch(`/api/milestones/${stats.nextMilestone.id}/approve`, {
                method: "POST"
            });
            if (!milestoneRes.ok) throw new Error("Failed to update milestone status");

            const res = await fetch("/api/activities/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: project.id,
                    type: "update",
                    title: "[마일스톤 승인]",
                    content: `마일스톤 승인 완료: ${stats.nextMilestone.title}`,
                    clientSummary: `발주사가 다음 마일스톤 '${stats.nextMilestone.title}'을(를) 서명 및 승인했습니다.`
                })
            });
            if (!res.ok) throw new Error("Approval failed");

            toast.success("목표가 승인되었습니다! 개발팀에 알림이 전송됩니다.");
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSigning(false);
        }
    };

    // Compute next milestone date
    const nextMilestone = stats.nextMilestoneDate ? new Date(stats.nextMilestoneDate) : null;
    const daysLeft = nextMilestone ? Math.max(0, Math.ceil((nextMilestone.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;


    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-10">
            {/* Header / Playable Demo with QA Overlay Hint */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-2 border border-emerald-500/20 backdrop-blur-md">
                            <ShieldCheck className="w-3.5 h-3.5" /> 고객님을 위한 대시보드
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">{project.name}</h1>
                    <p className="text-muted-foreground mt-2 text-lg">프로젝트가 얼마나 완성되었는지 투명하게 공유해 드릴게요.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <InviteDeveloperButton 
                        projectId={project.id} 
                        hasAgency={!!project.agencyId} 
                        pendingInvite={project.pendingInvite} 
                    />
                    <button onClick={() => { window.open("https://commitly-trust-layer.lovable.app", "_blank"); toast.success("테스트 환경 창이 열렸습니다."); }} className="px-6 py-3 border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 text-sm font-bold rounded-2xl hover:text-white transition-all shadow-sm flex items-center gap-2 relative group overflow-hidden">
                        <MonitorPlay className="w-5 h-5 relative z-10" />
                        <span className="relative z-10">지금까지 만들어진 앱 모양 미리보기</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                    </button>
                </div>
            </div>

            {/* Client Visual Banner - Glassmorphism & Micro-animations */}
            <div id="tour-dashboard-progress" className="bg-background/80 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden flex flex-col lg:flex-row gap-10">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -z-10" />

                {/* Main Progress Ring */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center">
                    <div className="relative w-40 h-40 mb-4 group">
                        <svg className="w-40 h-40 transform -rotate-90">
                            <circle cx="80" cy="80" r="68" fill="transparent" className="stroke-muted opacity-30" strokeWidth="16" />
                            <circle cx="80" cy="80" r="68" fill="transparent" stroke="url(#gradient-progress)"
                                strokeWidth="16" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 - (stats.progress / 100) * 2 * Math.PI * 68}
                                className="transition-all duration-1000 ease-out group-hover:scale-[1.02]" />
                            <defs>
                                <linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-500">{stats.progress}%</span>
                            <span className="text-[11px] font-bold text-muted-foreground mt-1 text-center">전체적인<br />달성률</span>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 my-auto">
                    <div className="bg-muted/30 p-5 rounded-3xl border border-border/40 hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3"><Layers className="w-5 h-5" /></div>
                        <p className="text-3xl font-black text-foreground mb-1">{stats.completedFeatures} <span className="text-base text-muted-foreground font-medium">/ {stats.totalFeatures}개</span></p>
                        <p className="text-[13px] font-bold text-muted-foreground">성공적으로 완성됨</p>
                    </div>
                    <div className="bg-warning/5 p-5 rounded-3xl border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer" onClick={() => router.push(`/projects/${project.id}/feed`)}>
                        <div className="w-10 h-10 rounded-xl bg-warning/20 text-warning-foreground flex items-center justify-center mb-3 animate-pulse"><AlertTriangle className="w-5 h-5" /></div>
                        <p className="text-3xl font-black text-warning mb-1">{stats.pendingDecisions}건</p>
                        <p className="text-[13px] font-bold text-muted-foreground">고객님 확인 대기 중</p>
                    </div>
                    <div className="bg-emerald-500/5 p-5 rounded-3xl border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors cursor-pointer" onClick={() => router.push(`/projects/${project.id}/timeline`)}>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mb-3"><CalendarCheck className="w-5 h-5" /></div>
                        <p className="text-3xl font-black text-emerald-600 mb-1">{nextMilestone ? `D-${daysLeft}` : '미정'}</p>
                        <p className="text-[13px] font-bold text-muted-foreground">다음 중요 일정 {nextMilestone ? `(${nextMilestone.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })})` : ''}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Budget & Timeline Status */}
                    {/* Removed Budget & Timeline Status */}
                    <div id="tour-dashboard-timeline" className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><CalendarCheck className="w-6 h-6 text-primary" /> 일정 현황</h2>
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground mb-4">프로젝트 완성도 흐름</h3>
                            <div className="h-32 bg-muted/20 border border-border/50 rounded-2xl p-4 flex items-end gap-2 px-6">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-lg relative group">
                                        <div 
                                            className={`absolute bottom-0 w-full bg-emerald-500/${i === 4 ? '100' : '60'} rounded-t-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]`} 
                                            style={{ height: `${i === 4 ? stats.progress : Math.max(10, stats.progress - (4 - i) * 5)}%` }} 
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase mt-2 px-6">
                                <span>시작</span><span></span><span></span><span></span><span className="text-emerald-500">현재</span>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Scope & Change Request Board */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /> 요구사항 투명 보드</h2>
                            <button onClick={() => router.push(`/projects/${project.id}/feed`)} className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm">
                                <PlusCircle className="w-3.5 h-3.5" /> 새 기능 제안하기
                            </button>
                        </div>


                        <div className="space-y-4">
                            {/* Base Contract Item */}
                            <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold flex items-center gap-2">기본 계약 목록 전체 <span className="bg-success/10 text-success text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">보호됨</span></p>
                                        <p className="text-xs text-muted-foreground mt-0.5">분석된 기획서 기반의 모든 기능 목록</p>
                                    </div>
                                </div>
                            </div>

                            {/* Empty or Real Change Requests */}
                            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/50 rounded-2xl bg-muted/5">
                                <p className="text-xs text-muted-foreground">현재 추가 요구사항이나 변경 협의 건이 없습니다.</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-warning/5 to-transparent border border-warning/20 rounded-3xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-warning/5 blur-3xl rounded-bl-full -z-10" />
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-warning-foreground"><Lock className="w-6 h-6" /> 이번 주 목표 확인 및 승인</h2>
                            {stats.nextMilestone && <button onClick={() => router.push(`/projects/${project.id}/feed`)} className="text-sm font-bold text-warning hover:underline">1건 대기중 →</button>}
                        </div>

                        {stats.nextMilestone ? (
                            <div className="bg-background/80 backdrop-blur-md rounded-2xl p-6 border-l-4 border-warning shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lg transition-all group">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-1"><FileCheck className="w-6 h-6" /></div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="px-2 py-0.5 rounded bg-warning text-warning-foreground text-[10px] font-bold uppercase tracking-wide">목표 대기중</span>
                                            <p className="font-bold text-lg text-foreground">{stats.nextMilestone.title}</p>
                                        </div>
                                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                                            {stats.nextMilestone.description || "해당 마일스톤에 대한 설명을 확인하고 승인해주세요."}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0 w-full md:w-32">
                                    <button disabled={isSigning} onClick={handleMilestoneSignoff} className="w-full px-5 py-3 bg-foreground text-background text-sm font-bold rounded-xl hover:bg-foreground/90 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isSigning ? "처리 중..." : "승인하기"}
                                    </button>
                                    <button onClick={() => router.push(`/projects/${project.id}/feed`)} className="w-full px-5 py-2 text-muted-foreground text-[13px] font-bold rounded-xl hover:bg-muted transition-colors">
                                        조금만 더 수정할게요
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-warning/30 rounded-2xl bg-warning/5">
                                <p className="text-sm font-bold text-warning">대기 중인 목표가 없어요!</p>
                                <p className="text-xs text-muted-foreground mt-1 text-center">지금은 승인할 마일스톤이 없습니다. 개발팀이 작업을 끝내고 승인을 요청하면 여기에 표시됩니다.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Removed Video Briefing as per request */}
                    <div id="tour-dashboard-ai-report" className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm group hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => router.push(`/projects/${project.id}/reports/latest`)}>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Star className="w-5 h-5 text-purple-500" /> 주간 요약 (AI작성)</h2>
                        <div className="space-y-4">
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap italic">
                                "{stats.latestAiSummary}"
                            </p>
                        </div>
                    </div>

                    {/* === 예산 소진율 게이지 제거됨 === */}

                    {/* === 팀 활동 히트맵 === */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-emerald-500" /> 이번 달 활동 히트맵</h2>
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 28 }).map((_, i) => {
                                // Simple mock derived from actual activities size
                                const level = stats.activities.length === 0 ? 0 : (i % 4 === 0 ? 1 : (i % 7 === 0 ? 2 : 0));
                                const colors = ['bg-muted/30', 'bg-emerald-500/20', 'bg-emerald-500/40', 'bg-emerald-500/70'];
                                return (
                                    <div key={i} className={`aspect-square rounded-sm ${colors[level]} border border-border/20 transition-colors hover:ring-2 hover:ring-emerald-500/30 cursor-default`} title={`Day ${i + 1}`} />
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between mt-3 text-[9px] text-muted-foreground font-bold">
                            <span>적음</span>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-sm bg-muted/30 border border-border/20" />
                                <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-border/20" />
                                <div className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-border/20" />
                                <div className="w-3 h-3 rounded-sm bg-emerald-500/70 border border-border/20" />
                            </div>
                            <span>많음</span>
                        </div>
                    </div>

                    {/* === AI 프로젝트 건강도 === */}
                    <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Star className="w-5 h-5 text-emerald-500" /> AI 프로젝트 건강도</h2>
                        <div className="flex items-center justify-center mb-4">
                            <div className="text-center">
                                <span className="text-5xl font-black text-emerald-500">{100 - stats.riskScore}</span>
                                <span className="text-lg font-bold text-muted-foreground ml-1">/100</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">진행률 준수</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width: `${100 - stats.riskScore * 0.5}%`}} /></div>
                                    <span className="font-bold text-emerald-500">{Math.round(100 - stats.riskScore * 0.5)}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">소통 품질</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{width: `${100 - stats.riskScore}%`}} /></div>
                                    <span className="font-bold text-purple-500">{100 - stats.riskScore}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">리스크 대응</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{width: `${100 - stats.riskScore}%`}} /></div>
                                    <span className="font-bold text-orange-500">{100 - stats.riskScore}</span>
                                </div>
                            </div>
                        </div>
                        {stats.riskScore === 0 ? (
                            <p className="inline-block px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] text-center mt-4 font-bold shadow-sm">
                                ✨ 매우 건강한 프로젝트예요!
                            </p>
                        ) : (
                            <Link 
                                href={`/projects/${project.id}/metrics/risk`} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-full border border-orange-200 text-[10px] text-center mt-4 font-bold transition-colors shadow-sm cursor-pointer"
                            >
                                ⚠️ 주의 요소가 발견되었습니다. 확인하기 <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>

                    {/* Agreed Assets Vault */}
                    <div id="tour-dashboard-vault" className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Lock className="w-5 h-5 text-amber-500" /> 최종 산출물 및 에셋
                            </h2>
                            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full border border-amber-500/20">보호됨</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                            계약 및 회의를 통해 상호 확정된 기획서와 설계도 등이 안전하게 영구 보관됩니다. (위변조 불가능)
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {project.scopeDocs && project.scopeDocs.length > 0 ? (
                                project.scopeDocs.filter(doc => doc.contentUrl).map(doc => (
                                    <a key={doc.id} href={doc.contentUrl!} download target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/80 border border-border/40 rounded-xl transition-all group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{doc.title}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                                    {new Date(doc.createdAt).toLocaleDateString('ko-KR')} 등록
                                                </p>
                                            </div>
                                        </div>
                                        <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 m-1" />
                                    </a>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl border border-dashed border-border/50">
                                    업로드된 자료가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-500" /> 바로 가기</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => router.push(`/projects/${project.id}/features`)} className="p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all text-left">
                                <Layers className="w-6 h-6 text-primary mb-3" />
                                <p className="text-sm font-bold">결과물 확인하기</p>
                            </button>
                            <button onClick={() => router.push(`/projects/${project.id}/documents`)} className="p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left">
                                <FileText className="w-6 h-6 text-blue-500 mb-3" />
                                <p className="text-sm font-bold">받은 서류함 가기</p>
                            </button>
                            <button onClick={() => router.push(`/projects/${project.id}/feed`)} className="p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-orange-500/30 hover:bg-orange-500/5 transition-all text-left">
                                <Bell className="w-6 h-6 text-orange-500 mb-3" />
                                <p className="text-sm font-bold">새소식 확인하기</p>
                            </button>
                            <button onClick={() => router.push(`/projects/${project.id}/logs`)} className="p-4 rounded-2xl bg-muted/40 border border-transparent hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left">
                                <MessageSquare className="w-6 h-6 text-purple-500 mb-3" />
                                <p className="text-sm font-bold">히스토리 보기</p>
                            </button>
                        </div>
                    </div>

                    {/* Daily Work Summary (AI Standup) */}
                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-3xl p-6 shadow-sm mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-2xl -z-10" />
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                <Sparkles className="w-5 h-5" /> AI 일일 작업 브리핑
                            </h2>
                            <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded border border-indigo-500/20">A.I 분석됨</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                            {stats.latestAiSummary || "현재 프로젝트 데이터를 분석하여 일일 브리핑을 생성 중입니다. 개발이 진행됨에 따라 이곳에 요약 리포트가 표시됩니다."}
                        </p>
                        <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground font-mono">
                            <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> 0 Commits Today</div>
                            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> 0 PRs</div>
                        </div>
                    </div>

                    {/* Client LIVE Pulse Stream */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-sm overflow-hidden relative">
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-tr-full -z-10" />

                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-500 animate-pulse" /> 개발팀은 지금 무엇을 하고 있을까요? 
                                <div className="w-2 h-2 rounded-full bg-success animate-ping ml-1" />
                            </h2>
                            <button
                                onClick={() => setShowTechWords(!showTechWords)}
                                className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${showTechWords ? 'bg-muted text-muted-foreground border border-border/80 hover:bg-muted/80' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'}`}
                            >
                                <Languages className="w-4 h-4" />
                                {showTechWords ? "개발자의 언어로 보기" : "간결한 요약 모드 (ON)"}
                            </button>
                        </div>

                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-blue-500/50 before:via-border/50 before:to-transparent">
                            {stats.activities.length > 0 ? stats.activities.map((act, idx) => (
                                <div key={act.id} className={`relative pl-8 ${idx > 0 ? 'opacity-90' : ''}`}>
                                    <div className={`absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-background border-2 ${idx === 0 ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-primary'}`} />
                                    {showTechWords ? (
                                        <>
                                            <p className="text-sm font-bold font-mono">{act.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1 font-mono">{act.content.substring(0, 60)}...</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-[15px] font-bold text-foreground">{act.clientSummary || act.title}</p>
                                            <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{act.clientSummary ? act.title : act.content.substring(0, 100)}</p>
                                        </>
                                    )}
                                    <p className="text-[10px] text-muted-foreground font-mono mt-2 w-max bg-muted/50 px-2 py-0.5 rounded">
                                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: ko })}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-xs text-muted-foreground text-center py-4">활동 기록이 없습니다.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SOS / Emergency Meeting Floating Action Button */}
            <button
                onClick={() => window.open("https://calendly.com", "_blank")}
                className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3.5 bg-background border border-border shadow-2xl rounded-full hover:border-blue-500/40 hover:bg-muted/50 transition-all hover:-translate-y-1 active:scale-95 group"
            >
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="text-left pr-2">
                    <p className="text-sm font-bold text-foreground leading-none mb-1">매니저 긴급 호출</p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-1">혹시 진행이 조금 답답하신가요?</p>
                </div>
            </button>
        </div>
    );
}

// ─────────────── SHARED COMPONENTS ───────────────
export function ExportReportButton() {
    const [open, setOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        const promise = new Promise((resolve) => setTimeout(resolve, 2000));
        toast.promise(promise, {
            loading: 'PDF 보고서 생성 및 다운로드 준비 중...',
            success: '생성 완료! 보고서가 디바이스에 저장되었습니다.',
            error: '보고서 생성에 실패했습니다.',
        });
        await promise;
        setIsExporting(false);
        setOpen(false);
    };

    return (
        <>
            <button onClick={() => setOpen(true)} className="px-5 py-2.5 bg-primary/10 border border-primary/20 text-primary text-sm font-bold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all shadow-sm active:scale-95 backdrop-blur-md">
                Export 리포트
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border border-border/50 shadow-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold pb-1 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" /> 보고서 내보내기
                        </DialogTitle>
                        <DialogDescription className="text-sm">현재 프로젝트 건강도와 진행률을 기반으로 PDF 보고서를 렌더링합니다.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button className="px-5 py-2.5 border border-border/60 text-foreground text-sm font-bold rounded-xl hover:bg-muted" onClick={() => setOpen(false)} disabled={isExporting}>취소</button>
                        <button className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl active:scale-95 flex items-center gap-2 disabled:opacity-50" onClick={handleExport} disabled={isExporting}>
                            {isExporting ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : <><Download className="w-4 h-4" /> 렌더링 시작</>}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Legacy exports kept for any remaining references
export function InteractiveCard({ children, className, projectId, modalType = "progress" }: { children: ReactNode; className?: string; projectId: string; modalType?: string; }) {
    const router = useRouter();
    return (<div onClick={() => router.push(`/projects/${projectId}/metrics/${modalType}`)} className={`${className} cursor-pointer`}>{children}</div>);
}

export function InteractiveRiskGauge({ children, className, projectId }: { children: ReactNode; className?: string; projectId: string; }) {
    const router = useRouter();
    return (<div onClick={() => router.push(`/projects/${projectId}/metrics/risk`)} className={`${className} cursor-pointer`}>{children}</div>);
}

export function DetailedReportCard({ children, projectId }: { children: ReactNode, projectId: string }) {
    const router = useRouter();
    return (<div onClick={() => router.push(`/projects/${projectId}/reports/latest`)} className="cursor-pointer w-full h-full">{children}</div>);
}

export function InviteDeveloperButton({ projectId, hasAgency, pendingInvite }: { projectId: string, hasAgency?: boolean, pendingInvite?: {email: string, name: string | null} | null }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [disconnectLoading, setDisconnectLoading] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || "초대에 실패했습니다.");
                return;
            }

            toast.success("개발사에게 파트너 연동 초대장이 발송되었습니다!");
            setOpen(false);
            setEmail("");
            window.location.reload();
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("정말 현재 연결된 파트너 개발사를 해제하시겠습니까? (이 작업으로 인해 프로젝트 설정이 변경될 수 있습니다.)")) return;
        
        setDisconnectLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/disconnect`, { method: "POST" });
            const data = await res.json();
            
            if (!res.ok) {
                toast.error(data.error || "해제에 실패했습니다.");
                return;
            }
            
            toast.success("파트너 개발사와의 연결이 안전하게 해제되었습니다.");
            window.location.reload();
        } finally {
            setDisconnectLoading(false);
        }
    }

    if (hasAgency) {
        return (
            <div className="flex items-center gap-2">
                <div className="px-5 py-3 flex-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2 cursor-pointer hover:bg-emerald-500/20 transition-all" onClick={() => setOpen(true)}>
                    <CheckCircle2 className="w-5 h-5" /> 파트너 연결 작동중
                </div>
                
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border border-border/50 shadow-2xl rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-extrabold pb-1 flex items-center gap-2 text-emerald-500">
                                 <CheckCircle2 className="w-5 h-5" /> 이미 연동된 파트너가 있습니다
                            </DialogTitle>
                            <DialogDescription className="text-sm">현재 이 프로젝트는 개발사 파트너와 성공적으로 양방향 연동되어 소통 중입니다. 다른 파트너와 작업하려면 먼저 기존 연결을 해제해야 합니다.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button type="button" className="px-5 py-2.5 border border-border/60 text-foreground text-sm font-bold rounded-xl hover:bg-muted" onClick={() => setOpen(false)}>닫기</button>
                            <button type="button" disabled={disconnectLoading} onClick={handleDisconnect} className="px-5 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 text-sm font-bold rounded-xl hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2">
                                {disconnectLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "파트너 권한 해제하기"}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    if (pendingInvite) {
        return (
            <div className="flex items-center gap-2 max-w-[280px]">
                <div className="px-4 py-3 min-w-0 border border-amber-500/30 bg-amber-500/10 text-amber-600 text-sm font-bold rounded-2xl shadow-sm flex items-center gap-2">
                    <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" /> 
                    <span className="truncate" title={`${pendingInvite.email} 연결 대기중`}>[수락 대기] {pendingInvite.name || pendingInvite.email}</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <button onClick={() => setOpen(true)} className="px-5 py-3 border border-primary/30 bg-primary/10 text-primary hover:bg-primary text-sm font-bold rounded-2xl hover:text-primary-foreground transition-all shadow-sm flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> 개발사 초대하기
            </button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md bg-background/95 backdrop-blur-2xl border border-border/50 shadow-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-extrabold pb-1 flex items-center gap-2">
                             <UserPlus className="w-5 h-5 text-primary" /> 파트너 개발사 초대
                        </DialogTitle>
                        <DialogDescription className="text-sm">함께 작업할 개발사의 이메일을 입력하세요. Commitly에 가입된 개발사 계정이어야 합니다.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="relative">
                            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="developer@agency.com"
                                className="w-full pl-12 pr-4 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                            />
                        </div>
                        <DialogFooter className="mt-6">
                            <button type="button" className="px-5 py-2.5 border border-border/60 text-foreground text-sm font-bold rounded-xl hover:bg-muted" onClick={() => setOpen(false)} disabled={isLoading}>취소</button>
                            <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-2 min-w-[100px]">
                                {isLoading ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : "초대 및 연결"}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
