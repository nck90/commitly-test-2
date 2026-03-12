"use client";

import { useEffect, useState } from "react";
import { generateSuggestedReplies } from "@/app/actions/aiReplies";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw, Scale, AlertTriangle, MessageSquare, CheckCircle, Clock, ArrowRight, FileEdit, Code2, ShieldCheck, Bell, Send, ThumbsUp, ThumbsDown, Eye, HelpCircle, Megaphone, Pin, PinOff, Sparkles } from "lucide-react";
import { ApprovalActions, InteractiveReplyForm } from "./FeedClient";

interface FeedItem {
    id: string;
    title: string;
    status: string;
    _feedType: "update" | "decision" | "risk";
    _date: Date;
    clientSummary?: string | null;
    rawNote?: string | null;
    description?: string | null;
    clientContext?: string | null;
    author?: any;
    confirmations?: any[];
    replies?: any[];
    options?: any[];
    content?: string | null; // Added content to FeedItem interface
    [key: string]: any;
}

export function FeedRoleView({ feedItems, projectId }: { feedItems: FeedItem[]; projectId: string }) {
    const { role } = useAuth();

    if (role === "developer") {
        return <DeveloperFeedView feedItems={feedItems} projectId={projectId} />;
    }
    return <ClientFeedView feedItems={feedItems} projectId={projectId} />;
}

// ═══════════════════════════════════════════════
//  DEVELOPER FEED — Full technical view + write capabilities
// ═══════════════════════════════════════════════
function DeveloperFeedView({ feedItems, projectId }: { feedItems: FeedItem[]; projectId: string }) {
    const [showCompose, setShowCompose] = useState(false);
    const [composeText, setComposeText] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const tags = [
        { id: 'decision', label: '🚨 결정 필요', desc: '클라이언트의 승인/선택이 필요할 때' },
        { id: 'report', label: '🎉 결과 보고', desc: '주요 마일스톤이나 중요 기능 완성 시' },
        { id: 'question', label: '❓ 단순 질문', desc: '기획 의도나 자료 요청 등' },
        { id: 'meeting', label: '📝 회의록', desc: '미팅 후 구두 협의 내용 박제' }
    ];

    const [isPosting, setIsPosting] = useState(false);

    const handlePostUpdate = async () => {
        if (!composeText.trim() || !selectedTag) {
            toast.error("내용과 태그(말머리)를 모두 선택해주세요.");
            return;
        }
        
        setIsPosting(true);
        try {
            const res = await fetch("/api/activities/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    type: selectedTag === 'decision' ? 'decision' : (selectedTag === 'question' ? 'update' : 'update'),
                    title: `[${tags.find(t => t.id === selectedTag)?.label}]`,
                    content: composeText,
                    clientSummary: selectedTag === 'decision' ? '클라이언트의 결정이 필요합니다.' : null
                })
            });
            if (!res.ok) throw new Error("Posting failed");
            toast.success(`[${tags.find(t => t.id === selectedTag)?.label}] 피드가 게시되었습니다.`);
            setComposeText("");
            setSelectedTag(null);
            setShowCompose(false);
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsPosting(false);
        }
    };


    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-600 text-xs font-bold flex items-center gap-1.5 border border-purple-500/20">
                        <Code2 className="w-3 h-3" /> Developer
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-inner"><MessageSquare className="w-6 h-6" /></div>
                    업무 피드
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">진행 상황을 기록하고 발주사에 공유합니다. 새소식, 결정사항, 주의사항을 타임라인으로 관리합니다.</p>
            </div>

            {/* Compose New Update */}
            <div className="commitly-card p-6 mb-8 border-l-4 border-l-primary">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> 진행 현황 공유하기</h2>
                    <button onClick={() => setShowCompose(!showCompose)} className="text-xs font-bold text-primary hover:underline">
                        {showCompose ? '접기' : '작성하기'}
                    </button>
                </div>
                {showCompose && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Tag Selection UI */}
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <p className="text-sm font-bold mb-3 flex items-center gap-2 text-foreground/80">
                                <ShieldCheck className="w-4 h-4 text-primary" /> 피드 목적 선택 (필수)
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {tags.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => setSelectedTag(tag.id)}
                                        className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all text-left ${selectedTag === tag.id ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background hover:bg-muted/50 border-border/60'}`}
                                    >
                                        <span className="font-bold text-sm">{tag.label}</span>
                                        <span className="text-[10px] text-muted-foreground">{tag.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={composeText}
                            onChange={(e) => setComposeText(e.target.value)}
                            placeholder="내용을 적어주세요. 작성된 모든 내용은 계약적 증빙 효력을 갖는 '서류함'에 영구 보존됩니다."
                            className="w-full h-32 p-4 border border-border/40 rounded-2xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none shadow-inner"
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground bg-primary/5 px-2 py-1 rounded text-primary border border-primary/10">
                                💡 법적/계약적 증빙 보호를 위해 모든 커뮤니케이션 이력이 박제됩니다.
                            </p>
                            <div className="flex gap-2">
                                <button disabled={isPosting} onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground rounded-xl border border-border/50 transition-colors">취소</button>
                                <button onClick={handlePostUpdate} disabled={isPosting || !composeText.trim() || !selectedTag} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 shadow-md">
                                    {isPosting ? '등록 중...' : '영구 보존 등록'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}
                {!showCompose && (
                    <p className="text-sm text-muted-foreground">발주사에게 이번 주 진행 상황을 보고하고, 결정이 필요한 사항을 요청하세요.</p>
                )}
            </div>

            {/* Feed Items */}
            <div className="space-y-6 relative">
                <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-border/40 hidden md:block" />

                {feedItems.length === 0 ? (
                    <div className="text-center py-24 border-2 border-dashed border-border/60 rounded-3xl text-muted-foreground bg-muted/10">
                        <p className="font-bold mb-1">아직 올라온 피드가 없어요</p>
                        <p className="text-sm">위에서 첫 업데이트를 작성해보세요.</p>
                    </div>
                ) : (
                    <>
                        {/* Removed Schedule Approval Mock */}


                        {feedItems.map((item) => (
                            <FeedCard key={`${item._feedType}-${item.id}`} item={item} projectId={projectId} isDeveloper={true} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
//  CLIENT FEED — Simplified, non-technical, action-oriented
// ═══════════════════════════════════════════════
function ClientFeedView({ feedItems, projectId }: { feedItems: FeedItem[]; projectId: string }) {
    const [activeFilter, setActiveFilter] = useState<string>("all");
    const [readItems, setReadItems] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`commitly_read_feed_${projectId}`);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });
    const [pinnedItems, setPinnedItems] = useState<Set<string>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`commitly_pinned_feed_${projectId}`);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });

    const markAsRead = (itemId: string) => {
        const newRead = new Set(readItems);
        newRead.add(itemId);
        setReadItems(newRead);
        localStorage.setItem(`commitly_read_feed_${projectId}`, JSON.stringify(Array.from(newRead)));
    };

    const togglePin = (itemId: string) => {
        const newPinned = new Set(pinnedItems);
        if (newPinned.has(itemId)) {
            newPinned.delete(itemId);
            toast.success("고정이 해제되었어요.");
        } else {
            newPinned.add(itemId);
            toast.success("소식이 상단에 고정되었어요!");
        }
        setPinnedItems(newPinned);
        localStorage.setItem(`commitly_pinned_feed_${projectId}`, JSON.stringify(Array.from(newPinned)));
    };

    const handleConfirmRead = (item: FeedItem) => {
        markAsRead(`${item._feedType}-${item.id}`);
        toast.success("확인 완료! 내가 확인한 내역에서 다시 보실 수 있어요.");
    };

    const isItemPending = (i: FeedItem) => {
        if (i._feedType === 'update') return i.status === 'new';
        if (i._feedType === 'decision') return i.status === 'pending';
        if (i._feedType === 'risk') return i.status === 'active';
        return false;
    };

    const filterTabs = [
        { id: 'all', label: '전체', count: feedItems.length },
        { id: 'decision', label: '결정 필요', count: feedItems.filter(i => i._feedType === 'decision' && isItemPending(i)).length },
        { id: 'update', label: '결과 보고', count: feedItems.filter(i => i._feedType === 'update').length },
        { id: 'risk', label: '주의 사항', count: feedItems.filter(i => i._feedType === 'risk').length },
    ];

    let filteredItems = activeFilter === 'all' ? feedItems : feedItems.filter(i => i._feedType === activeFilter);

    // Sort: pinned first, then by date
    filteredItems = [...filteredItems].sort((a, b) => {
        const aKey = `${a._feedType}-${a.id}`;
        const bKey = `${b._feedType}-${b.id}`;
        const aPinned = pinnedItems.has(aKey) ? 1 : 0;
        const bPinned = pinnedItems.has(bKey) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(b._date).getTime() - new Date(a._date).getTime();
    });

    const needsAction = filteredItems.filter(isItemPending);
    const resolved = filteredItems.filter(i => !isItemPending(i));
    const unreadCount = feedItems.filter(i => !readItems.has(`${i._feedType}-${i.id}`)).length;

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" /> 고객님 전용
                    </span>
                    {unreadCount > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-destructive text-white text-[10px] font-black animate-pulse">
                            {unreadCount}건 새 소식
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-inner"><Bell className="w-6 h-6" /></div>
                    새소식 · 알림
                </h1>
                <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">개발팀에서 전해온 소식이에요. 확인이 필요한 것들을 먼저 보여드릴게요.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                {filterTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeFilter === tab.id ? 'bg-foreground text-background shadow-md' : 'bg-muted/40 text-muted-foreground hover:bg-muted border border-border/50'}`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${activeFilter === tab.id ? 'bg-background/20 text-background' : 'bg-background text-foreground'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Action Required Section */}
            {needsAction.length > 0 ? (
                <div className="mb-10">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center"><Bell className="w-4 h-4" /></span>
                        확인이 필요해요 <span className="text-sm font-normal text-muted-foreground ml-1">({needsAction.length}건)</span>
                    </h2>
                    <div className="space-y-4">
                        {needsAction.map((item) => {
                            const itemKey = `${item._feedType}-${item.id}`;
                            const isRead = readItems.has(itemKey);
                            const isPinned = pinnedItems.has(itemKey);
                            return (
                                <div key={itemKey} className="relative">
                                    {!isRead && (
                                        <div className="absolute -left-2 top-4 w-3 h-3 bg-destructive rounded-full z-10 shadow-sm animate-pulse" />
                                    )}
                                    {isPinned && (
                                        <div className="absolute -right-1 -top-1 z-10">
                                            <span className="text-[9px] font-bold bg-primary text-white px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                                <Pin className="w-2.5 h-2.5" /> 고정됨
                                            </span>
                                        </div>
                                    )}
                                    <ClientFeedCard item={item} projectId={projectId} onConfirm={() => handleConfirmRead(item)} onTogglePin={() => togglePin(itemKey)} isPinned={isPinned} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-24 border-2 border-dashed border-border/60 rounded-3xl bg-muted/10 mb-10">
                    <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">모든 소식을 확인하셨네요!</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">개발팀에서 새로운 소식을 올리면 이곳에 알림이 나타나요.</p>
                    <a href={`/projects/${projectId}/logs`} className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all">
                        내가 확인한 내역 보기 <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            )}

            {/* Resolved items */}
            {resolved.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-muted-foreground">
                        <CheckCircle className="w-5 h-5 text-success" /> 내가 확인한 내역 ({resolved.length}건)
                    </h2>
                    <div className="space-y-4 opacity-70">
                        {resolved.map((item) => {
                            const itemKey = `${item._feedType}-${item.id}`;
                            return <ClientFeedCard key={itemKey} item={item} projectId={projectId} isPinned={false} />;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════
//  CLIENT FEED CARD — Simplified, non-technical
// ═══════════════════════════════════════════════
function ClientFeedCard({ item, projectId, onConfirm, onTogglePin, isPinned }: { item: FeedItem; projectId: string; onConfirm?: () => void; onTogglePin?: () => void; isPinned?: boolean }) {
    const [showAiSummary, setShowAiSummary] = useState(false);
    const router = useRouter();

    const isCheckType = item._feedType === 'decision' || item._feedType === 'risk';
    const isUrgent = item._feedType === 'risk';

    // AI Suggestions State
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    useEffect(() => {
        // Fetch AI suggestions only for actionable feed items (decisions or risks) that are pending
        if (isCheckType && item.status === 'pending') {
            const fetchSuggestions = async () => {
                setLoadingSuggestions(true);
                try {
                    const ctx = item.content || item.clientSummary || item.title;
                    const result = await generateSuggestedReplies(ctx, true);
                    setSuggestions(result);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoadingSuggestions(false);
                }
            };
            fetchSuggestions();
        }
    }, [item.status, isCheckType, item.content, item.clientSummary, item.title]);

    // Format content with newlines
    const descriptionLines = (item.content || '').split('\n').filter((l: string) => l.trim().length > 0);
    const isPending = (item._feedType === 'update' && item.status === 'new') || 
                      (item._feedType === 'decision' && item.status === 'pending') || 
                      (item._feedType === 'risk' && item.status === 'active');
    const typeConfig = {
        update: { icon: Megaphone, label: '새로운 소식', color: 'blue', bg: 'from-blue-500 to-blue-600' },
        decision: { icon: HelpCircle, label: '결정해주세요', color: 'purple', bg: 'from-purple-500 to-purple-600' },
        risk: { icon: AlertTriangle, label: '주의할 점', color: 'red', bg: 'from-red-500 to-red-600' },
    };
    const config = typeConfig[item._feedType];

    return (
        <div className={`commitly-card p-5 md:p-6 hover:shadow-md transition-all ${isPending ? 'border-l-4 border-l-warning' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                    <div className={`p-2.5 rounded-xl text-white shadow-sm bg-gradient-to-br ${isPending ? config.bg : 'from-success/80 to-success'}`}>
                        {isPending ? <config.icon className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-base line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {new Date(item._date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                            {item.author?.name && ` · ${item.author.name}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Pin toggle */}
                    {onTogglePin && (
                        <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isPinned ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm ${isPending ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success text-white border-success'}`}>
                        {isPending ? '확인 필요' : '결정 완료'}
                    </span>
                </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 text-sm leading-relaxed border border-border/30">
                {item._feedType === 'update' ? (
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start">
                            <span className="text-primary bg-primary/10 px-2.5 py-1 rounded-md text-xs font-bold self-start border border-primary/20 shrink-0">요약</span>
                            <span className="text-foreground">{item.clientSummary || '아직 요약이 준비되지 않았어요.'}</span>
                        </div>
                        {loadingSuggestions ? (
                            <div className="flex gap-2">
                                <div className="h-7 w-24 bg-primary/20 rounded-lg animate-pulse" />
                                <div className="h-7 w-32 bg-primary/20 rounded-lg animate-pulse" />
                            </div>
                        ) : suggestions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((suggestion, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            toast.loading("의견을 등록하는 중...");
                                            try {
                                                const res = await fetch('/api/activities/confirm', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ 
                                                        targetId: item.id, 
                                                        targetType: item._feedType, 
                                                        action: 'approved', 
                                                        comment: suggestion 
                                                    })
                                                });
                                                if (res.ok) {
                                                    toast.dismiss();
                                                    toast.success("의견이 잘 전달되었어요!");
                                                    if (onConfirm) onConfirm();
                                                    router.refresh();
                                                }
                                            } catch (err) {
                                                toast.dismiss();
                                                toast.error("오류가 발생했습니다.");
                                            }
                                        }}
                                        className="text-[11px] px-3 py-1.5 bg-background border border-primary/20 rounded-lg text-foreground cursor-pointer hover:bg-primary/10 transition-colors text-left truncate max-w-[250px]"
                                        title={suggestion}
                                    >
                                        &quot;{suggestion}&quot;
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : item._feedType === 'decision' ? (
                    <div className="space-y-3">
                        <p className="text-foreground/90">{item.description}</p>
                        {item.clientContext && (
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1.5"><Eye className="w-3 h-3" /> 쉽게 설명하면</p>
                                <p className="text-foreground/80 text-sm">{item.clientContext}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-foreground/90">{item.description}</p>
                )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center justify-between">
                {isPending ? (
                    <div className="flex-1">
                        <ApprovalActions targetId={item.id} projectId={projectId} targetType={item._feedType} />
                    </div>
                ) : (
                    <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> 서류함 박제됨
                    </span>
                )}
                {isPending && onConfirm && item._feedType === 'update' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                        className="px-4 py-2 bg-success/10 text-success text-xs font-bold rounded-xl border border-success/20 hover:bg-success hover:text-white transition-all flex items-center gap-1.5 ml-3"
                    >
                        <CheckCircle className="w-3.5 h-3.5" /> 확인했어요
                    </button>
                )}
            </div>
            {/* Comment Thread */}
            <div className="mt-4 pt-3 border-t border-border/40">
                <h4 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> 의견
                    {item._feedType === 'update' && item.confirmations?.length ? ` (${item.confirmations.length})` : ''}
                    {item.replies?.length ? ` (${item.replies.length})` : ''}
                </h4>
                <div className="space-y-2 mb-3">
                    {item._feedType === 'update' && item.confirmations?.map((conf: any) => (
                        <div key={conf.id} className="bg-background p-3 rounded-xl text-sm border border-border/40 flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/15 shrink-0 flex items-center justify-center font-bold text-[10px]">{conf.user?.name?.charAt(0) || '?'}</div>
                            <div>
                                <span className="font-bold text-xs text-muted-foreground">{conf.user?.name}</span>
                                <p className="text-sm mt-0.5">{conf.comment}</p>
                            </div>
                        </div>
                    ))}
                    {item.replies?.map((rep: any) => (
                        <div key={rep.id} className="bg-background p-3 rounded-xl text-sm border border-border/40 flex gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/15 shrink-0 flex items-center justify-center font-bold text-[10px]">{rep.author?.name?.charAt(0) || '?'}</div>
                            <div>
                                <span className="font-bold text-xs text-muted-foreground">{rep.author?.name}</span>
                                <p className="text-sm mt-0.5">{rep.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <InteractiveReplyForm projectId={projectId} targetId={item.id} targetType={item._feedType} />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
//  DEVELOPER FEED CARD — Full technical details
// ═══════════════════════════════════════════════
function FeedCard({ item, projectId, isDeveloper }: { item: FeedItem; projectId: string; isDeveloper: boolean }) {
    return (
        <div className="commitly-card p-6 md:p-8 flex flex-col gap-5 relative overflow-hidden hover:shadow-md transition-shadow ml-0 md:ml-20">
            <div className="hidden md:flex absolute top-8 -left-[64px] w-6 h-6 rounded-full bg-background border-4 border-background items-center justify-center z-10 shadow-sm ring-2 ring-border/50">
                <div className={`w-2 h-2 rounded-full ${item._feedType === 'update' ? 'bg-blue-500' : item._feedType === 'decision' ? 'bg-purple-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                    <div className={`p-3 rounded-2xl text-white shadow-md bg-gradient-to-br ${item._feedType === 'update' ? 'from-blue-500 to-blue-600' : item._feedType === 'decision' ? 'from-purple-500 to-purple-600' : 'from-red-500 to-red-600'}`}>
                        {item._feedType === 'update' && <RefreshCw className="w-5 h-5" />}
                        {item._feedType === 'decision' && <Scale className="w-5 h-5" />}
                        {item._feedType === 'risk' && <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {new Date(item._date).toLocaleString()}
                            {item.author?.name && ` · ${item.author.name}`}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm border ${item.status === 'pending' || item.status === 'active' || item.status === 'new'
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : 'bg-success/10 text-success border-success/20'
                    }`}>{item.status}</span>
            </div>

            <div className="bg-accent/30 rounded-2xl p-5 text-sm leading-relaxed border border-border/40 shadow-inner">
                {item._feedType === 'update' ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-3">
                            <strong className="text-primary flex-shrink-0 bg-primary/10 px-2.5 py-1 rounded-md text-xs self-start mt-0.5 border border-primary/20 shadow-sm">AI 요약</strong>
                            <span className="text-foreground font-medium text-base">{item.clientSummary || 'AI 요약이 준비되지 않았습니다.'}</span>
                        </div>
                        {item.rawNote && (
                            <div className="flex flex-col gap-2 text-xs text-muted-foreground bg-background rounded-xl p-4 border border-border/50 font-mono shadow-sm">
                                <strong className="flex-shrink-0 opacity-70 flex items-center gap-1.5"><FileEdit className="w-3.5 h-3.5" /> Developer Note (원문)</strong>
                                <span className="opacity-90 leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-border/50">{String(item.rawNote)}</span>
                            </div>
                        )}
                    </div>
                ) : item._feedType === 'decision' ? (
                    <div className="space-y-3">
                        <p className="text-base text-foreground/90">{item.description}</p>
                        {item.clientContext && (
                            <div className="mt-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <strong className="text-primary flex items-center gap-1.5 mb-1.5"><MessageSquare className="w-4 h-4" /> 쉬운 설명</strong>
                                <p className="text-foreground/80 leading-relaxed">{item.clientContext}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-base text-foreground/90">{item.description}</div>
                )}
            </div>

            <div className="mt-2 pt-4 border-t border-border/60">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> 의견</h4>
                <div className="space-y-3 mb-4">
                    {item._feedType === 'update' && item.confirmations?.map((conf: any) => (
                        <div key={conf.id} className="bg-muted p-3 rounded-lg text-sm border border-border/50 flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 flex items-center justify-center font-bold text-xs">{conf.user?.name?.charAt(0) || '?'}</div>
                            <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">{conf.user?.name}</div>
                                {conf.comment}
                            </div>
                        </div>
                    ))}
                    {item.replies?.map((rep: any) => (
                        <div key={rep.id} className="bg-muted p-3 rounded-lg text-sm border border-border/50 flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 flex items-center justify-center font-bold text-xs">{rep.author?.name?.charAt(0) || '?'}</div>
                            <div>
                                <div className="font-semibold text-xs text-muted-foreground mb-1">{rep.author?.name}</div>
                                {rep.content}
                            </div>
                        </div>
                    ))}
                </div>
                <InteractiveReplyForm projectId={projectId} targetId={item.id} targetType={item._feedType} />
            </div>
        </div>
    );
}
