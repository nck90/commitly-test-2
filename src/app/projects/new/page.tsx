"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, FolderOpen, FileText, CheckCircle2, ArrowRight, ArrowLeft, Upload, X, UserPlus, Target, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createProjectWithScope } from "@/app/actions/project";
import { analyzeProjectDocuments } from "@/app/actions/aiExtraction";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function NewProjectWizard() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && (session?.user as any)?.role !== "client") {
            toast.error("프로젝트 생성 권한이 없습니다. 발주사 계정으로 로그인해 주세요.");
            router.push("/");
        }
    }, [session, status, router]);

    if (status === "loading" || (session?.user as any)?.role !== "client") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [contractText, setContractText] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [partnerEmail, setPartnerEmail] = useState("");
    const [budgetRange, setBudgetRange] = useState("");
    const [timeline, setTimeline] = useState("");
    const [parsedFeatures, setParsedFeatures] = useState<string[]>([]);
    const [parsedMilestones, setParsedMilestones] = useState<any[]>([]);
    const [aiAnalyzed, setAiAnalyzed] = useState(false);

    const hasDocuments = files.length > 0 || contractText.trim() !== "";

    // Step 2 → Step 3: Auto AI Analysis
    const handleStep2Next = async () => {
        if (!hasDocuments) {
            toast.error("기획서 또는 계약 문서를 업로드해 주세요.", {
                description: "문서가 있어야 AI가 프로젝트를 분석할 수 있습니다."
            });
            return;
        }

        setAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append("text", contractText);
            files.forEach(file => formData.append("files", file));

            console.log("[Wizard] Requesting AI Analysis...");
            const result = await analyzeProjectDocuments(formData);
            
            if (result.budgetRange) setBudgetRange(result.budgetRange);
            if (result.timeline) setTimeline(result.timeline);
            if (result.features) setParsedFeatures(result.features);
            if (result.milestones && result.milestones.length > 0) setParsedMilestones(result.milestones);
            
            setAiAnalyzed(true);
            toast.success("AI 분석이 완료되었습니다!", {
                description: "예산, 기간, 기능 목록이 자동으로 추출되었습니다."
            });
            setStep(3);
        } catch (error: any) {
            console.error("AI Analysis Error:", error);
            toast.error("AI 분석 중 오류가 발생했습니다: " + (error.message || "다시 시도해 주세요."));
            setStep(3);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (step === 1) {
            if (!name.trim()) return;
            setStep(2);
            return;
        }
        if (step === 2) {
            handleStep2Next();
            return;
        }
        if (step === 3) {
            setStep(4);
            // Auto-start project creation when entering step 4
            startProjectCreation();
            return;
        }
    };

    const startProjectCreation = async () => {
        setCreating(true);
        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("document", contractText);

            files.forEach((file) => {
                formData.append("files", file);
            });
            if (partnerEmail) {
                formData.append("partnerEmail", partnerEmail);
            }
            if (parsedFeatures.length > 0) {
                formData.append("parsedFeatures", JSON.stringify(parsedFeatures));
            }
            if (parsedMilestones.length > 0) {
                formData.append("parsedMilestones", JSON.stringify(parsedMilestones));
            }

            const projectId = await createProjectWithScope(formData);
            
            // Brief delay for UX polish
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (parsedFeatures.length === 0) {
                toast.warning("문서 분석 내용이 부족합니다.", {
                    description: "프로젝트가 생성되었으나, AI가 기능을 추출하지 못했습니다. 대시보드에서 문서를 추가로 보강해 주세요."
                });
            } else {
                toast.success("프로젝트가 성공적으로 생성되었습니다!");
            }
            router.push(`/projects/${projectId}`);
        } catch (err: any) {
            toast.error("오류가 발생했습니다: " + err.message);
            setCreating(false);
            setStep(3);
        }
    };

    const handlePrev = () => setStep(s => Math.max(1, s - 1));

    // Full screen loading for project creation (Step 4)
    if (step === 4) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-8 max-w-md"
                >
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 rounded-3xl bg-primary/20 animate-ping" />
                        <div className="relative w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                            <Shield className="h-10 w-10 text-primary-foreground" />
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-extrabold tracking-tight">프로젝트를 만들고 있어요</h1>
                        <p className="text-muted-foreground text-base">
                            AI가 문서를 분석하고, 기능 목록을 정리하고,<br />
                            마일스톤을 설정하고 있어요. 잠시만 기다려주세요!
                        </p>
                    </div>

                    <div className="space-y-4 w-full">
                        <div className="space-y-3 text-sm">
                            <LoadingStep label="프로젝트 데이터베이스 생성" done />
                            <LoadingStep label="기획 문서 저장 및 분석" done />
                            <LoadingStep label="기능 목록(Kanban) 생성" done={creating} />
                            <LoadingStep label="마일스톤 스케줄 설정" done={false} />
                            <LoadingStep label="파트너 초대장 발송" done={false} />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        처리 중입니다...
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-12 px-6">
            <div className="w-full max-w-3xl mb-8 flex justify-center">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg">
                    <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
            </div>

            <div className="w-full max-w-3xl">
                {/* Progress Bar - 4 Steps */}
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border/50 rounded-full -z-10" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full -z-10 transition-all duration-300"
                        style={{ width: `${((step - 1) / 3) * 100}%` }}
                    />

                    {[
                        { num: 1, label: "기본 정보", icon: FolderOpen },
                        { num: 2, label: "문서 업로드", icon: FileText },
                        { num: 3, label: "예산 / 초대", icon: Target },
                        { num: 4, label: "생성 완료", icon: CheckCircle2 }
                    ].map((s) => (
                        <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${step >= s.num ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-accent text-muted-foreground border border-border'
                                }`}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-xs font-semibold ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Form Container */}
                <form onSubmit={handleSubmit} className="commitly-card p-8 min-h-[400px] flex flex-col relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        {/* STEP 1: 기본 정보 */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">새 프로젝트 시작하기</h2>
                                    <p className="text-muted-foreground text-sm">새롭게 진행할 프로젝트의 기본 정보를 입력해 주세요.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[13px] font-semibold mb-2 block">프로젝트 이름 <span className="text-destructive">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="commitly-input"
                                            placeholder="예) Commitly iOS 앱 개발"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[13px] font-semibold mb-2 block">한 줄 요약</label>
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="commitly-input"
                                            placeholder="프로젝트의 목적을 간략하게 적어주세요."
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: 문서 업로드 (필수) + AI 자동분석 */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">기획서 업로드 <span className="text-destructive">*</span></h2>
                                    <p className="text-muted-foreground text-sm">
                                        기획서 또는 계약 문서를 업로드하면, <strong className="text-primary">AI가 자동으로 분석</strong>하여 예산, 기간, 기능 목록을 추출합니다.
                                    </p>
                                </div>

                                {analyzing ? (
                                    /* AI 분석 중 화면 */
                                    <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-6">
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                                                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                                <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl font-bold">AI가 문서를 분석하고 있어요</h3>
                                            <p className="text-muted-foreground text-sm max-w-sm">
                                                기획서에서 예산, 개발 기간, 필요한 기능 목록을 <br />자동으로 추출하고 있습니다. 잠시만 기다려주세요...
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* 문서 업로드 폼 */
                                    <div className="space-y-4">
                                        <div 
                                            className="w-full border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center bg-background/30 cursor-pointer group relative overflow-hidden"
                                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                                                }
                                            }}
                                            onClick={() => document.getElementById("file-upload")?.click()}
                                        >
                                            <input 
                                                id="file-upload" 
                                                type="file" 
                                                multiple 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    if (e.target.files) {
                                                        setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                                    }
                                                }}
                                            />
                                            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                                            <p className="text-sm font-semibold text-foreground">파일을 이 곳에 끌어다 놓거나 클릭하여 업로드</p>
                                            <p className="text-xs text-muted-foreground mt-2">PDF, 워드, 이미지 등 (한 번에 여러 개 가능)</p>
                                        </div>

                                        {files.length > 0 && (
                                            <div className="space-y-2">
                                                {files.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                                                        <span className="text-sm font-medium text-foreground truncate max-w-[80%]">{file.name}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                                                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative flex py-4 items-center">
                                            <div className="flex-grow border-t border-border"></div>
                                            <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase font-semibold text-center">또는 직접 텍스트 입력</span>
                                            <div className="flex-grow border-t border-border"></div>
                                        </div>

                                        <textarea
                                            value={contractText}
                                            onChange={(e) => setContractText(e.target.value)}
                                            className="w-full h-32 commitly-input p-4 resize-none"
                                            placeholder="이곳에 기획서 텍스트 등을 직접 붙여넣으셔도 됩니다."
                                        />

                                        {hasDocuments && (
                                            <div className="pt-2 animate-in fade-in slide-in-from-bottom-2">
                                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                        <Sparkles className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-foreground">다음 단계에서 AI가 자동으로 분석합니다</h4>
                                                        <p className="text-xs text-muted-foreground">예산, 기간, 기능 목록을 문서에서 추출하여 자동 입력합니다.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 3: AI 결과 + 예산/기간 + 파트너 초대 통합 */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 space-y-6"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2">예산, 기간 및 파트너 초대</h2>
                                        <p className="text-muted-foreground text-sm">AI가 추출한 정보를 확인하고, 파트너 개발사를 초대하세요.</p>
                                    </div>
                                    {aiAnalyzed && (
                                        <div className={`p-2 rounded-xl flex items-center gap-2 text-xs font-bold border ${parsedFeatures.length > 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                                            <Sparkles className="h-4 w-4" /> 
                                            {parsedFeatures.length > 0 ? 'AI 추출 완료' : 'AI 분석 내용 부족'}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6 mt-2">
                                    {/* 예산 */}
                                    <div>
                                        <label className="text-[13px] font-semibold mb-2 block">
                                            예상 전체 예산 범위
                                            {!budgetRange && <span className="text-destructive ml-1 text-xs">(문서에서 감지되지 않아 직접 입력이 필요합니다)</span>}
                                        </label>
                                        <select
                                            value={budgetRange}
                                            onChange={(e) => setBudgetRange(e.target.value)}
                                            className={`commitly-input w-full ${budgetRange ? 'border-primary/50 bg-primary/5' : ''}`}
                                        >
                                            <option value="">예산 범위 선택...</option>
                                            <option value="1000-3000">1,000만원 ~ 3,000만원</option>
                                            <option value="3000-5000">3,000만원 ~ 5,000만원</option>
                                            <option value="5000-10000">5,000만원 ~ 1억원</option>
                                            <option value="10000+">1억원 이상</option>
                                        </select>
                                    </div>
                                    {/* 기간 */}
                                    <div>
                                        <label className="text-[13px] font-semibold mb-2 block">
                                            원하는 개발 기간
                                            {!timeline && <span className="text-destructive ml-1 text-xs">(문서에서 감지되지 않아 직접 입력이 필요합니다)</span>}
                                        </label>
                                        <select
                                            value={timeline}
                                            onChange={(e) => setTimeline(e.target.value)}
                                            className={`commitly-input w-full ${timeline ? 'border-primary/50 bg-primary/5' : ''}`}
                                        >
                                            <option value="">예상 소요 시간 선택...</option>
                                            <option value="1-2">1~2개월</option>
                                            <option value="3-4">3~4개월</option>
                                            <option value="5-6">5~6개월</option>
                                            <option value="6+">6개월 이상</option>
                                        </select>
                                    </div>

                                    {/* AI 추출 기능 목록 미리보기 */}
                                    {parsedFeatures.length > 0 && (
                                        <div className="bg-muted/30 border border-border/50 rounded-xl p-4">
                                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                AI가 추출한 기능 목록 ({parsedFeatures.length}건)
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {parsedFeatures.map((feat, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-primary/5 text-primary text-xs font-medium rounded-lg border border-primary/10">
                                                        {feat}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 구분선 */}
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-border"></div>
                                        <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase font-semibold">파트너 초대 (선택)</span>
                                        <div className="flex-grow border-t border-border"></div>
                                    </div>

                                    {/* 파트너 초대 */}
                                    <div>
                                        <label className="text-[13px] font-semibold mb-2 block">개발사 이메일</label>
                                        <input
                                            type="email"
                                            value={partnerEmail}
                                            onChange={(e) => setPartnerEmail(e.target.value)}
                                            className="commitly-input"
                                            placeholder="developer@agency.com"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">입력하지 않고 나중에 설정에서 초대할 수도 있습니다.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="pt-6 mt-auto border-t border-border flex justify-between items-center">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={step === 1 ? () => router.push('/') : handlePrev}
                            disabled={loading || analyzing}
                            className="gap-2 rounded-xl"
                        >
                            {step === 1 ? '취소' : <><ArrowLeft className="w-4 h-4" /> 이전 단계</>}
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading || analyzing || (step === 1 && !name.trim()) || (step === 2 && !hasDocuments)}
                            className="gap-2 rounded-xl shadow-md px-6"
                        >
                            {analyzing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>
                            ) : step === 3 ? (
                                '프로젝트 생성 시작'
                            ) : (
                                <>다음 단계 <ArrowRight className="w-4 h-4" /></>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function LoadingStep({ label, done }: { label: string; done: boolean }) {
    return (
        <div className="flex items-center gap-3">
            {done ? (
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
            )}
            <span className={`${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
        </div>
    );
}
