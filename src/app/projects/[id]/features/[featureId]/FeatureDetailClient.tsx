"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, FileText, AlertCircle, Calendar, CheckSquare, GitCommit, Link as LinkIcon, Paperclip, CheckCircle2, Circle, MoreHorizontal, User, Clock, MessagesSquare, Activity, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function FeatureDetailClient({ project, feature }: { project: any, feature: any }) {
    const { role } = useAuth();
    const [progress, setProgress] = useState(feature.progressPercentage || 0);
    const [isSaving, setIsSaving] = useState(false);
    
    // Description state
    const [description, setDescription] = useState(feature.description || feature.clientDescription || "");
    const [isGenerating, setIsGenerating] = useState(false);

    // Checklist state
    const [checklists, setChecklists] = useState<any[]>(feature.checklists || []);
    const [newChecklistContent, setNewChecklistContent] = useState("");
    const [isAddingChecklist, setIsAddingChecklist] = useState(false);

    // Discussion Replies state
    const [replies, setReplies] = useState<any[]>(feature.replies || []);
    const [newReplyContent, setNewReplyContent] = useState("");
    const [isPostingReply, setIsPostingReply] = useState(false);

    // Map priority
    const priorityConfig = {
        'high': { label: 'High Priority', style: 'bg-destructive/10 text-destructive border-destructive/20' },
        'medium': { label: 'Medium Priority', style: 'bg-primary/10 text-primary border-primary/20' },
        'low': { label: 'Low Priority', style: 'bg-muted text-muted-foreground border-border/50' },
    };
    const currentPriority = priorityConfig[feature.priority as keyof typeof priorityConfig] || priorityConfig.medium;

    const handleProgressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setProgress(val);
    };

    const handleSaveProgress = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/features/${feature.id}/progress`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ progressPercentage: progress })
            });
            if (!res.ok) throw new Error("Failed to update progress");
            toast.success("개발 진척도가 업데이트 되었습니다.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const res = await fetch(`/api/features/${feature.id}/generate-description`, {
                method: "POST"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "상세 설명 생성에 실패했습니다");
            
            setDescription(data.description);
            toast.success("AI가 상세 설명을 성공적으로 장성했습니다!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddChecklist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChecklistContent.trim()) return;
        
        setIsAddingChecklist(true);
        try {
            const res = await fetch(`/api/features/${feature.id}/checklists`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newChecklistContent })
            });
            if (!res.ok) throw new Error("Failed to add checklist");
            const newChecklist = await res.json();
            
            setChecklists([...checklists, newChecklist]);
            setNewChecklistContent("");
            toast.success("항목이 추가되었습니다.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsAddingChecklist(false);
        }
    };

    const handleToggleChecklist = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setChecklists(checklists.map(c => c.id === id ? { ...c, isCompleted: !currentStatus } : c));
        
        try {
            const res = await fetch(`/api/checklists/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isCompleted: !currentStatus })
            });
            if (!res.ok) throw new Error("Failed to update status");
        } catch (e: any) {
            // Revert
            setChecklists(checklists.map(c => c.id === id ? { ...c, isCompleted: currentStatus } : c));
            toast.error("업데이트에 실패했습니다.");
        }
    };

    const handleDeleteChecklist = async (id: string) => {
        if (!window.confirm("정말 이 항목을 삭제하시겠습니까?")) return;
        
        // Optimistic update
        const prevChecklists = [...checklists];
        setChecklists(checklists.filter(c => c.id !== id));
        
        try {
            const res = await fetch(`/api/checklists/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete checklist");
            toast.success("항목이 삭제되었습니다.");
        } catch (e: any) {
            setChecklists(prevChecklists);
            toast.error("삭제에 실패했습니다.");
        }
    };

    const handlePostReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReplyContent.trim()) return;
        
        setIsPostingReply(true);
        try {
            const res = await fetch(`/api/features/${feature.id}/replies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newReplyContent })
            });
            if (!res.ok) throw new Error("메시지 전송에 실패했습니다.");
            
            const newReply = await res.json();
            setReplies([...replies, newReply]);
            setNewReplyContent("");
            toast.success("메시지가 전송되었습니다.");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsPostingReply(false);
        }
    };

    const updates = feature.updates || [];

    return (
        <div className="max-w-[1200px] mx-auto py-8 px-4 sm:px-6">
            <Link
                href={`/projects/${project.id}/features`}
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-8 bg-muted/50 px-4 py-2 rounded-xl"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Board
            </Link>

            {/* Header Section */}
            <header className="mb-10 pb-8 border-b border-border/50">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-sm font-bold text-muted-foreground flex items-center gap-1.5 bg-muted px-3 py-1 rounded-lg border border-border/50">
                        <LinkIcon className="w-3.5 h-3.5" /> 작업 번호: TSK-{feature.sortOrder + 100}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${currentPriority.style}`}>
                        {currentPriority.label}
                    </span>
                    <span className="px-3 py-1 text-xs font-bold bg-muted/50 text-muted-foreground rounded-md border border-border/50 uppercase tracking-wider">
                        {feature.status.replace("_", " ")}
                    </span>
                    {feature.decisionNeededFlag && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full animate-pulse shadow-sm">
                            <AlertCircle className="w-4 h-4" /> 고객님 확인 대기 중
                        </span>
                    )}
                </div>

                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-loose mb-4 text-foreground/90">
                    {feature.name}
                </h1>
                
                <div className="flex items-center gap-6 mt-6 bg-muted/20 inline-flex px-5 py-3 rounded-2xl border border-border/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">담당 파트너</p>
                            <p className="text-sm font-bold">커밋리 개발팀</p>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-border/80" />
                    <div className="flex flex-col justify-center">
                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">요청 등록일</p>
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">{new Date(feature.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Column: Details & Content */}
                <div className="lg:col-span-2 space-y-10">
                    
                    {/* Description */}
                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-primary" /> 기능 상세 설명 및 기대 효과
                        </h2>
                        <div className="bg-background border border-border/50 rounded-3xl p-8 shadow-sm max-w-none">
                            {description ? (
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h3: ({node, ...props}) => <h3 className="text-xl font-extrabold text-foreground mt-10 mb-5 border-b border-border/40 pb-3" {...props} />,
                                        h4: ({node, ...props}) => <h4 className="text-lg font-bold text-foreground mt-8 mb-4" {...props} />,
                                        p: ({node, ...props}) => <p className="text-muted-foreground leading-[1.8] mb-6 text-[15.5px] tracking-tight" {...props} />,
                                        ul: ({node, ...props}) => <ul className="space-y-3 mb-8 pl-1" {...props} />,
                                        li: ({node, ...props}) => (
                                            <li className="flex items-start gap-3 text-[15.5px] text-muted-foreground group leading-[1.8] tracking-tight">
                                                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors flex-shrink-0" />
                                                <span className="flex-1">{props.children}</span>
                                            </li>
                                        ),
                                        ol: ({node, ...props}) => <ol className="list-decimal list-outside pl-5 space-y-3 mb-8 text-muted-foreground text-[15.5px] leading-[1.8] tracking-tight" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-semibold text-foreground bg-primary/5 px-1.5 py-0.5 rounded-md" {...props} />,
                                    }}
                                >
                                    {description.replace(/^```markdown\n?/i, "").replace(/\n?```$/i, "").trim()}
                                </ReactMarkdown>
                            ) : (
                                <div className="text-muted-foreground italic flex flex-col items-center justify-center py-6 opacity-80 space-y-4">
                                    <FileText className="w-10 h-10 mb-1 text-muted-foreground/50" />
                                    <div className="text-center">
                                        <p>아직 상세 설명이 등록되지 않았습니다.</p>
                                        <p className="text-xs mt-1">프로젝트 기획 문서를 토대로 AI에게 작성을 맡겨보세요.</p>
                                    </div>
                                    <button 
                                        onClick={handleGenerateDescription}
                                        disabled={isGenerating}
                                        className="mt-4 flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-4 py-2 rounded-xl transition-all font-bold disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중...</>
                                        ) : (
                                            <><Sparkles className="w-4 h-4" /> AI로 상세 설명 자동 완성하기</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Sub-tasks */}
                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <CheckSquare className="w-5 h-5 text-primary" /> 개발 진행 체크리스트 (Milestones)
                        </h2>
                        <div className="bg-background border border-border/50 rounded-3xl p-3 shadow-sm">
                            {checklists.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-muted-foreground">등록된 체크리스트 항목이 없습니다.</p>
                                </div>
                            ) : (
                                checklists.map(task => (
                                    <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 rounded-2xl transition-colors group">
                                        <button 
                                            onClick={() => role === 'developer' && handleToggleChecklist(task.id, task.isCompleted)}
                                            disabled={role !== 'developer'}
                                            className="focus:outline-none"
                                        >
                                            {task.isCompleted ? (
                                                <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 border border-success/20 hover:bg-success/20 transition-colors">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground/50 flex items-center justify-center shrink-0 border border-border hover:bg-muted/80 transition-colors">
                                                    <Circle className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                        <span className={`text-[15px] flex-1 ${task.isCompleted ? 'text-muted-foreground font-medium line-through decoration-muted-foreground/30' : 'text-foreground font-bold'}`}>
                                            {task.content}
                                        </span>
                                        {role === 'developer' && (
                                            <button
                                                onClick={() => handleDeleteChecklist(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                title="항목 삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}

                            {role === 'developer' && (
                                <form onSubmit={handleAddChecklist} className="mt-4 flex items-center gap-2 p-2 border-t border-border/50 pt-4">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            value={newChecklistContent}
                                            onChange={(e) => setNewChecklistContent(e.target.value)}
                                            placeholder="새로운 작업 항목을 입력하세요..."
                                            className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                            disabled={isAddingChecklist}
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={!newChecklistContent.trim() || isAddingChecklist}
                                        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                                    >
                                        <Plus className="w-4 h-4" /> 추가
                                    </button>
                                </form>
                            )}
                        </div>
                    </section>

                    {/* Communication */}
                    <section>
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <MessagesSquare className="w-5 h-5 text-primary" /> 소통 및 논의 기록
                        </h2>
                        <div className="bg-background border border-border/50 rounded-3xl p-6 shadow-sm flex flex-col h-[500px]">
                            
                            {/* Message List */}
                            <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 custom-scrollbar">
                                {replies.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60">
                                        <MessagesSquare className="w-12 h-12 mb-4 opacity-50" />
                                        <p className="text-sm font-bold text-foreground/80 mb-1">아직 주고받은 메시지가 없습니다.</p>
                                        <p className="text-xs">이 기능과 관련해 궁금한 점이 있으시다면 언제든 남겨주세요.</p>
                                    </div>
                                ) : (
                                    replies.map((reply) => (
                                        <div key={reply.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 text-primary-foreground font-bold text-xs shadow-sm capitalize">
                                                {reply.author?.name ? reply.author.name.charAt(0) : "U"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col bg-muted/40 rounded-2xl rounded-tl-sm p-4 border border-border/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-bold text-foreground/90">{reply.author?.name || "알 수 없음"}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{new Date(reply.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap word-break-keep-all">{reply.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Form */}
                            <form onSubmit={handlePostReply} className="pt-4 border-t border-border/50 flex gap-3 relative">
                                <div className="absolute left-4 top-[26px] z-10">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-black uppercase">
                                        {role?.charAt(0) || "U"}
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={newReplyContent}
                                    onChange={(e) => setNewReplyContent(e.target.value)}
                                    placeholder="기능에 대한 문의나 피드백을 남겨주세요..."
                                    className="flex-1 bg-muted/30 border border-border/50 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                                    disabled={isPostingReply}
                                />
                                <button
                                    type="submit"
                                    disabled={!newReplyContent.trim() || isPostingReply}
                                    className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                                >
                                    {isPostingReply ? "전송 중..." : "전송"}
                                </button>
                            </form>
                        </div>
                    </section>
                </div>

                {/* Right Column: Metadata, Progress, Activity */}
                <div className="space-y-8">
                    
                    {/* Progress Control */}
                    <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
                        <h3 className="font-bold mb-6 flex items-center justify-between">
                            실시간 개발 진도율
                            <span className="text-3xl font-black text-primary font-mono bg-background px-3 py-1 rounded-xl shadow-inner border border-border/50">{progress}%</span>
                        </h3>
                        
                        <div className="mb-6">
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={progress} 
                                onChange={handleProgressChange}
                                disabled={role !== "developer"}
                                className={`w-full h-3 rounded-full appearance-none shadow-inner cursor-pointer ${role === 'developer' ? 'bg-primary/20' : 'bg-muted'}`}
                                style={{
                                    background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`
                                }}
                            />
                            <div className="flex justify-between text-[11px] font-bold text-muted-foreground mt-3 tracking-wide">
                                <span>작업 시작</span>
                                <span>절반 완성</span>
                                <span>개발 완료</span>
                            </div>
                        </div>

                        {role === "developer" && progress !== feature.progressPercentage && (
                            <button 
                                onClick={handleSaveProgress}
                                disabled={isSaving}
                                className="w-full py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 mt-4"
                            >
                                {isSaving ? "저장 중..." : "진척도 업데이트 반영하기"}
                            </button>
                        )}
                        {role !== "developer" && (
                            <div className="bg-background/80 p-3 rounded-xl border border-border/50 mt-4 backdrop-blur-sm">
                                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                    해당 수치는 <strong>실제 개발팀의 코드 커밋 및 작업량</strong>을 바탕으로 실시간 산정됩니다.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Resources & Attachments */}
                    <div className="bg-background border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold flex items-center gap-2 mb-5 text-[15px]">
                            <Paperclip className="w-4 h-4 text-primary" /> 관련 기획 및 디자인 문서
                        </h3>
                        {(!project.scopeDocs || project.scopeDocs.length === 0) ? (
                            <div className="text-center py-8 border border-dashed border-border/50 rounded-2xl bg-muted/10">
                                <p className="text-sm text-muted-foreground">등록된 관련 문서가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {project.scopeDocs.map((doc: any) => (
                                    <a key={doc.id} href={doc.contentUrl || "#"} target={doc.contentUrl ? "_blank" : "_self"} rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-2xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors group shadow-sm bg-muted/20">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black
                                                ${doc.type === 'design' ? 'bg-pink-500/10 text-pink-500' : 
                                                  doc.type === 'spec' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {doc.type === 'design' ? 'Fig' : doc.type === 'spec' ? 'PDF' : 'Doc'}
                                            </div>
                                            <span className="text-sm font-bold truncate group-hover:text-primary transition-colors">{doc.title}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity / Git Log */}
                    <div className="bg-background border border-border/50 rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold flex items-center gap-2 mb-6 text-[15px]">
                            <Activity className="w-5 h-5 text-primary" /> 팀 작업 현황 히스토리
                        </h3>
                        <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-border/80 before:to-transparent overflow-hidden">
                            {updates.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-sm text-muted-foreground">기록된 히스토리가 없습니다.</p>
                                </div>
                            ) : (
                                updates.map((log: any, i: number) => (
                                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group mb-6 last:mb-0">
                                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 bg-primary`} />
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-muted/20 p-4 rounded-2xl border border-border/40 hover:border-primary/30 transition-colors shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black tracking-wider uppercase">보고</div>
                                                <span className="text-[11px] font-bold text-muted-foreground">{log.author?.name || "시스템"}</span>
                                            </div>
                                            <p className="text-sm font-medium text-foreground/90 leading-relaxed word-break-keep-all">{log.content}</p>
                                            <p className="text-xs font-bold text-muted-foreground mt-3 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
