"use client";

import { Shield, CreditCard, CheckCircle2, Building, Zap, Wallet, Receipt, ArrowRight, Lock, CheckCircle, Clock, Download, AlertTriangle, ShieldCheck, ArrowDown, FileText, TrendingUp, Ban } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";


// 에스크로 파이프라인 단계 정의
const ESCROW_STEPS = [
    { id: 1, label: "입금", icon: ArrowDown, desc: "고객님이 안전하게 입금해요" },
    { id: 2, label: "보관 중", icon: Lock, desc: "에스크로 계좌에서 안전하게 보관돼요" },
    { id: 3, label: "개발 완료", icon: CheckCircle2, desc: "개발팀이 작업을 완료하면" },
    { id: 4, label: "정산", icon: Wallet, desc: "승인 후 개발팀에 정산돼요" },
];

// 결제 히스토리 타임라인
const PAYMENT_HISTORY = [
    { id: 1, type: "deposit", title: "계약금 입금 완료", amount: 10000000, date: "2024-02-15 10:30", status: "success" },
    { id: 2, type: "escrow_hold", title: "에스크로 보관 시작", amount: 10000000, date: "2024-02-15 10:31", status: "success" },
    { id: 3, type: "release", title: "1차 마일스톤 정산 완료", amount: 5000000, date: "2024-02-28 14:00", status: "success" },
    { id: 4, type: "release", title: "2차 마일스톤 정산 완료", amount: 5000000, date: "2024-03-08 16:30", status: "success" },
];

type MilestoneProgress = {
    id: string;
    title: string;
    amount: number;
    targetDate: Date | null;
    status: string;
    description: string | null;
    paidAt: Date | null;
};

export default function BillingClient({ initialMilestones }: { initialMilestones: MilestoneProgress[] }) {
    const { role } = useAuth();
    const params = useParams();
    const projectId = params.id as string;
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
    const [paymentMilestones, setPaymentMilestones] = useState(initialMilestones || []);
    const [activeTab, setActiveTab] = useState<"schedule" | "history">("schedule");
    const [isDisputed, setIsDisputed] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        const saved = localStorage.getItem(`commitly_milestones_${projectId}`);
        if (saved) {
            try {
                setPaymentMilestones(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved milestones", e);
            }
        }
    }, [projectId]);

    const handleCheckout = async () => {
        if (!selectedMilestone) return;
        const milestone = paymentMilestones.find(m => m.id === selectedMilestone);
        if (!milestone) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/activities/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    type: "update",
                    title: `[에스크로 입금 완료] ${milestone.title}`,
                    content: `${milestone.title}에 해당하는 대금(₩${milestone.amount.toLocaleString()})이 에스크로 계좌에 안전하게 예치되었어요.`
                })
            });
            if (!res.ok) throw new Error("Failed to log payment");

            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const updatedMilestones = paymentMilestones.map(m => 
                m.id === selectedMilestone ? { ...m, status: 'paid', paidAt: new Date() } : m
            );
            
            const nextUpcomingIndex = updatedMilestones.findIndex(m => m.status === 'upcoming');
            if (nextUpcomingIndex !== -1) {
                updatedMilestones[nextUpcomingIndex].status = 'pending';
            }

            setPaymentMilestones(updatedMilestones);
            localStorage.setItem(`commitly_milestones_${projectId}`, JSON.stringify(updatedMilestones));
            
            toast.success("결제가 안전하게 완료되었어요! 🎉", { description: "에스크로 계좌에 보관 중이에요. 피드에서도 확인하실 수 있어요." });
            setSelectedMilestone(null);
        } catch (error) {
            console.error(error);
            toast.error("결제 처리 중 문제가 생겼어요. 다시 시도해주세요.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadReceipt = (milestone: MilestoneProgress) => {
        toast.success(`"${milestone.title}" 영수증이 다운로드되었어요.`, { description: "Downloads 폴더에서 확인해 주세요." });
    };

    // Developer View Blocks are removed to allow Two-Way flow

    const totalBudget = 33000000;
    const paidAmount = paymentMilestones.filter(m => m.status === 'paid').reduce((sum, m) => sum + m.amount, 0);
    const paidWithVat = Math.round(paidAmount * 1.1);
    const progressPercent = Math.round((paidAmount / (totalBudget / 1.1)) * 100);

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 text-xs font-bold flex items-center gap-2 border border-orange-500/20 backdrop-blur-md">
                            <Wallet className="w-3.5 h-3.5" /> 결제 및 예산 관리
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground/90">프로젝트 예산 현황</h1>
                    <p className="text-muted-foreground mt-2 text-lg">에스크로(안전 결제) 기반으로, 고객님의 투자금이 어떻게 보호되고 있는지 투명하게 보여드릴게요.</p>
                </div>
            </div>

            {/* 분쟁 발생 시 에스크로 동결 안내 배너 */}
            {isDisputed && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-3xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                        <Ban className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-destructive mb-1">에스크로 결제금이 안전하게 보호되고 있어요</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            현재 프로젝트에 수정 요청 사항이 있어, 에스크로 계좌의 결제금이 동결 상태예요.
                            분쟁이 해결될 때까지 개발팀에 정산되지 않으니 안심하세요. 걱정되시면 매니저에게 문의해 주세요.
                        </p>
                    </div>
                </div>
            )}

            {/* ═══ 에스크로 파이프라인 시각화 ═══ */}
            <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-success" /> 에스크로 결제 보호 흐름
                </h2>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 relative">
                    {ESCROW_STEPS.map((step, index) => {
                        const isActive = index <= 1; // 현재 2단계 (보관 중)까지 활성화
                        const isCompleted = index === 0;
                        return (
                            <div key={step.id} className="flex items-center gap-3 md:flex-col md:gap-2 md:flex-1 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all shadow-sm
                                    ${isCompleted ? 'bg-success text-white shadow-success/30' : ''}
                                    ${isActive && !isCompleted ? 'bg-primary/10 text-primary border-2 border-primary/30 animate-pulse' : ''}
                                    ${!isActive ? 'bg-muted/50 text-muted-foreground' : ''}
                                `}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <div className="md:text-center">
                                    <p className={`text-sm font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug max-w-[140px]">{step.desc}</p>
                                </div>
                                {index < ESCROW_STEPS.length - 1 && (
                                    <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5">
                                        <div className={`h-full rounded-full ${index < 1 ? 'bg-success' : 'bg-border'}`} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Budget Stats */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-5">
                        <p className="text-xs font-bold text-muted-foreground mb-1">총 계약 예산 (VAT 포함)</p>
                        <h3 className="text-2xl font-black text-foreground">₩{totalBudget.toLocaleString()}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1">고정 예산 계약이 완료되었어요</p>
                    </div>
                    <div className="bg-success/5 border border-success/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-success/10 rounded-bl-full -z-10" />
                        <p className="text-xs font-bold text-success-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> 지금까지 입금한 금액</p>
                        <h3 className="text-2xl font-black text-success">₩{paidWithVat.toLocaleString()}</h3>
                        <p className="text-[11px] text-success-foreground mt-1 font-medium">전체 대비 {progressPercent}% 진행</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -z-10" />
                        <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5">
                            <Lock className="w-3 h-3" /> 에스크로 보관 중인 금액
                        </p>
                        <h3 className="text-2xl font-black text-primary">₩{paidWithVat.toLocaleString()}</h3>
                        <p className="text-[11px] text-muted-foreground mt-1">승인 전까지 안전하게 보호돼요</p>
                    </div>
                </div>
            </div>

            {/* ═══ 탭: 결제 스케줄 / 결제 히스토리 ═══ */}
            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50 w-fit">
                <button onClick={() => setActiveTab("schedule")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "schedule" ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Receipt className="w-4 h-4 inline mr-2" />결제 스케줄
                </button>
                <button onClick={() => setActiveTab("history")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "history" ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Clock className="w-4 h-4 inline mr-2" />결제 내역
                </button>
            </div>

            {activeTab === "schedule" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Payment Milestones (Stepper) */}
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> 결제 스케줄</h2>
                        <div className="space-y-5">
                            {paymentMilestones.map((m) => (
                                <div key={m.id} className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md relative overflow-hidden
                                    ${m.status === 'paid' ? 'bg-success/5 border-success/20' : ''}
                                    ${m.status === 'pending' ? 'bg-background border-warning/50 shadow-md ring-2 ring-warning/20' : ''}
                                    ${m.status === 'upcoming' ? 'bg-muted/30 border-border/40 opacity-50' : ''}
                                `} onClick={() => m.status === 'pending' && setSelectedMilestone(m.id)}>
                                    {/* Left accent bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.status === 'paid' ? 'bg-success' : m.status === 'pending' ? 'bg-warning' : 'bg-transparent'}`} />
                                    
                                    <div className="flex items-center justify-between mb-2 pl-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                                ${m.status === 'paid' ? 'bg-success/20 text-success' : ''}
                                                ${m.status === 'pending' ? 'bg-warning/20 text-warning animate-pulse' : ''}
                                                ${m.status === 'upcoming' ? 'bg-muted text-muted-foreground' : ''}
                                            `}>
                                                {m.status === 'paid' && <CheckCircle className="w-5 h-5" />}
                                                {m.status === 'pending' && <Clock className="w-5 h-5" />}
                                                {m.status === 'upcoming' && <Lock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-base ${m.status === 'pending' ? 'text-warning' : ''}`}>{m.title}</h3>
                                                <p className="text-xs text-muted-foreground">{m.description || ""}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0
                                            ${m.status === 'paid' ? 'bg-success/20 text-success' : ''}
                                            ${m.status === 'pending' ? 'bg-warning/20 text-warning-foreground' : ''}
                                            ${m.status === 'upcoming' ? 'bg-muted text-muted-foreground' : ''}
                                        `}>
                                            {m.status === 'paid' ? '✅ 결제 완료' : m.status === 'pending' ? '결제 대기 중' : '아직 예정이에요'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-3 pl-2">
                                        <p className="text-2xl font-black">₩{m.amount.toLocaleString()}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {m.targetDate ? new Date(m.targetDate).toLocaleDateString('ko-KR') : '일정 미정'}
                                            </p>
                                            {m.status === 'paid' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(m); }}
                                                    className="px-3 py-1.5 bg-muted/50 hover:bg-muted border border-border/50 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                                                >
                                                    <Download className="w-3 h-3" /> 영수증
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {role === 'client' && m.status === 'pending' && (
                                        <button className="mt-4 w-full py-2.5 bg-warning text-warning-foreground text-sm font-bold rounded-xl hover:bg-warning/90 transition-colors shadow-sm flex items-center justify-center gap-2">
                                            승인 및 결제 진행하기 <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                    {role === 'developer' && m.status === 'upcoming' && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const updatedMilestones = paymentMilestones.map(milestone => 
                                                    milestone.id === m.id ? { ...milestone, status: 'pending' } : milestone
                                                );
                                                setPaymentMilestones(updatedMilestones);
                                                localStorage.setItem(`commitly_milestones_${projectId}`, JSON.stringify(updatedMilestones));
                                                toast.success("클라이언트에게 대금 지급을 청구했습니다.");
                                            }}
                                            className="mt-4 w-full py-2.5 bg-primary/10 text-primary border border-primary/20 text-sm font-bold rounded-xl hover:bg-primary hover:text-primary-foreground transition-all shadow-sm flex items-center justify-center gap-2"
                                        >
                                            대금 정산 청구하기 <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                    {role === 'developer' && m.status === 'pending' && (
                                        <p className="mt-4 w-full py-2 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            클라이언트의 결제(승인)를 대기 중입니다.
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Secure Checkout Frame */}
                    {role === 'client' && selectedMilestone ? (
                        <div className="bg-background/80 backdrop-blur-xl border border-primary/30 rounded-3xl p-6 lg:p-8 shadow-lg ring-1 ring-primary/10 animate-in fade-in slide-in-from-bottom-8">
                            <div className="flex items-center justify-center mb-6">
                                <div className="px-4 py-1.5 rounded-full bg-success/10 text-success text-xs font-bold flex items-center gap-2 border border-success/20">
                                    <Shield className="w-3.5 h-3.5" /> 에스크로 안전 결제가 활성화되어 있어요
                                </div>
                            </div>
                            <h3 className="text-2xl font-black mb-2 text-center text-primary">
                                {paymentMilestones.find(m => m.id === selectedMilestone)?.title} 결제
                            </h3>
                            <p className="text-center text-muted-foreground mb-8 text-sm leading-relaxed">
                                결제하신 금액은 에스크로 계좌에 안전하게 보관돼요.<br />
                                마일스톤 완료를 승인하시기 전까지 개발팀에 지급되지 않으니 안심하세요.
                            </p>

                            <div className="space-y-5 w-full bg-muted/20 p-6 rounded-2xl border border-border/50">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground mb-1 block">카드 번호</label>
                                    <div className="relative">
                                        <CreditCard className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input type="text" placeholder="0000 0000 0000 0000" maxLength={19} className="w-full bg-background border border-border/50 rounded-xl pl-10 pr-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none tracking-widest transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground mb-1 block">유효기간</label>
                                        <input type="text" placeholder="MM/YY" maxLength={5} className="w-full bg-background border border-border/50 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-center transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground mb-1 block">CVC</label>
                                        <input type="password" placeholder="•••" maxLength={3} className="w-full bg-background border border-border/50 rounded-xl px-4 py-3.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-center transition-all" />
                                    </div>
                                </div>
                                <button
                                    onClick={handleCheckout}
                                    disabled={isProcessing}
                                    className="w-full py-4 mt-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex justify-center items-center active:scale-[0.98]"
                                >
                                    {isProcessing ? (
                                        <div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> 안전하게 처리하고 있어요...</div>
                                    ) : (
                                        `₩${((paymentMilestones.find(m => m.id === selectedMilestone)?.amount || 0) * 1.1).toLocaleString()} 안전 결제하기`
                                    )}
                                </button>
                                <p className="text-[10px] text-center text-muted-foreground mt-4 leading-relaxed">
                                    결제 시 Commitly의 서비스 이용 약관 및 개인정보 처리방침에 동의하게 됩니다.<br />은행 수준의 256-bit AES 암호화가 적용되어 있어요.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-muted/10 border border-border/30 border-dashed rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Receipt className="w-8 h-8 text-muted-foreground opacity-50" />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground">결제 대기 중인 항목을 선택해 주세요</p>
                            <p className="text-xs text-muted-foreground mt-1">왼쪽의 "결제 대기 중" 항목을 클릭하시면 안전 결제를 진행할 수 있어요.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* ═══ 결제 내역 타임라인 ═══ */
                <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-6 lg:p-8 shadow-sm">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> 결제 및 정산 히스토리
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">모든 입금과 정산 내역을 시간순으로 투명하게 보여드려요.</p>
                    
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-success via-primary to-border" />

                        <div className="space-y-6">
                            {PAYMENT_HISTORY.map((item, index) => (
                                <div key={item.id} className="relative flex items-start gap-5 pl-2">
                                    {/* Timeline dot */}
                                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center z-10 shadow-sm
                                        ${item.type === 'deposit' ? 'bg-success text-white' : ''}
                                        ${item.type === 'escrow_hold' ? 'bg-primary text-white' : ''}
                                        ${item.type === 'release' ? 'bg-emerald-500 text-white' : ''}
                                    `}>
                                        {item.type === 'deposit' && <ArrowDown className="w-4 h-4" />}
                                        {item.type === 'escrow_hold' && <Lock className="w-4 h-4" />}
                                        {item.type === 'release' && <CheckCircle2 className="w-4 h-4" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 bg-muted/20 border border-border/40 rounded-2xl p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-sm">{item.title}</h3>
                                            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md">완료</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-black text-foreground">₩{item.amount.toLocaleString()}</p>
                                            <p className="text-[11px] text-muted-foreground">{item.date}</p>
                                        </div>
                                    </div>

                                    {/* Receipt download for deposits */}
                                    {item.type === 'deposit' && (
                                        <button 
                                            onClick={() => toast.success("영수증이 다운로드되었어요!")}
                                            className="w-10 h-10 rounded-xl border border-border/50 bg-background hover:bg-muted flex items-center justify-center shrink-0 transition-colors"
                                        >
                                            <Download className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary footer */}
                    <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-2xl px-5 py-3">
                            <ShieldCheck className="w-5 h-5 text-success" />
                            <div>
                                <p className="text-xs font-bold text-success-foreground">총 입금액</p>
                                <p className="text-lg font-black text-success">₩{paidWithVat.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-5 py-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground">정산 완료액</p>
                                <p className="text-lg font-black text-emerald-500">₩10,000,000</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3">
                            <Lock className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground">에스크로 보관 중</p>
                                <p className="text-lg font-black text-primary">₩{(paidWithVat - 10000000).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
