"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { RefreshCcw, Github } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function NotificationToggle({ id, defaultChecked = true }: { id: string, defaultChecked?: boolean }) {
    const [checked, setChecked] = useState(defaultChecked);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(`commitly_setting_${id}`);
        if (saved !== null) {
            setChecked(saved === 'true');
        }
    }, [id]);

    const handleChange = () => {
        const newValue = !checked;
        setChecked(newValue);
        localStorage.setItem(`commitly_setting_${id}`, String(newValue));
        toast.success("알림 설정 변경됨", {
            description: newValue ? "이제부터 해당 알림 수신이 활성화됩니다." : "해당 알림 수신이 비활성화되었습니다."
        });
    };

    if (!mounted) return <div className="w-11 h-6 bg-muted rounded-full"></div>;

    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={handleChange}
                id={id}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
    );
}

import { updateProjectGithubSettings, cancelInvite, detachPartner, invitePartner } from "@/app/actions/project";
import { getGithubRepos } from "@/app/actions/github";
import { Shield, Key, AlertCircle, UserMinus, UserPlus, Mail, Trash2, CheckCircle2 as CheckCircleIcon, Users } from "lucide-react";

export function PartnerManagementSection({ 
    projectId, 
    agency, 
    invites 
}: { 
    projectId: string, 
    agency?: { id: string, name: string | null, email: string } | null,
    invites?: any[]
}) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await invitePartner(projectId, email);
            toast.success("초대가 전송되었습니다!", { description: `${email} 주소로 초대 메일이 발송됩니다.` });
            setEmail("");
            router.refresh();
        } catch (e) {
            toast.error("초대 전송 실패");
        } finally {
            setLoading(true);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!confirm("초대를 취소하시겠습니까?")) return;
        try {
            await cancelInvite(inviteId);
            toast.success("초대가 취소되었습니다.");
            router.refresh();
        } catch (e) {
            toast.error("초대 취소 실패");
        }
    };

    const handleDetach = async () => {
        if (!confirm("현재 파트너와 연결을 해제하시겠습니까? 프로젝트 접근 권한이 즉시 회수됩니다.")) return;
        try {
            await detachPartner(projectId);
            toast.success("파트너 연결이 해제되었습니다.");
            router.refresh();
        } catch (e) {
            toast.error("해제 실패");
        }
    };

    return (
        <div className="commitly-card p-6 border-l-4 border-l-orange-500">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-orange-500" />
                파트너(개발사) 관리
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
                프로젝트를 함께 진행할 개발사를 관리합니다. 초대를 보내거나 파트너를 변경할 수 있습니다.
            </p>

            {agency ? (
                /* 1. 파트너가 있는 경우 */
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">{agency.name || '알 수 없는 개발사'}</h3>
                                <p className="text-xs text-muted-foreground">{agency.email}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDetach}
                            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm font-bold rounded-xl hover:bg-destructive/20 transition-colors"
                        >
                            <UserMinus className="w-4 h-4" />
                            연결 해제
                        </button>
                    </div>
                </div>
            ) : invites && invites.length > 0 ? (
                /* 2. 초대 대기 중인 경우 */
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center text-warning">
                                <Mail className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">승인 대기 중</h3>
                                <p className="text-xs text-muted-foreground">{invites[0].agency.email} 주소로 보낸 초대를 승인 대기 중입니다.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleCancelInvite(invites[0].id)}
                            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground text-sm font-bold rounded-xl hover:bg-muted/80 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            초대 취소
                        </button>
                    </div>
                </div>
            ) : (
                /* 3. 파트너가 없는 경우 - 초대 폼 */
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold">개발사 초대하기</label>
                        <div className="flex gap-3">
                            <input
                                type="email"
                                placeholder="developer@partner.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1 px-4 py-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all shadow-inner"
                            />
                            <button
                                onClick={handleInvite}
                                disabled={!email || loading}
                                className="px-6 py-3 bg-orange-500 text-white font-bold text-sm rounded-xl hover:bg-orange-600 transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                <UserPlus className="w-4 h-4" />
                                초대장 발송
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            초대받은 개발사가 Commitly에 가입하거나 로그인하여 수락하면 프로젝트 협업이 시작됩니다.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export function GithubIntegrationPanel({ 
    projectId, 
    initialRepoUrl, 
    initialToken 
}: { 
    projectId: string, 
    initialRepoUrl?: string | null, 
    initialToken?: string | null 
}) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [isSyncing, setIsSyncing] = useState(false);
    const [repoUrl, setRepoUrl] = useState(initialRepoUrl || "");
    const [pat, setPat] = useState(initialToken || "");

    const [repos, setRepos] = useState<any[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);

    useEffect(() => {
        if (searchParams?.get("githubLinked") === "true") {
            toast.success("GitHub OAuth 연결 완료!", { description: "이제 레포지토리를 선택해주세요." });
            router.replace(`/projects/${projectId}/settings`); // clear query
        } else if (searchParams?.get("error")) {
            toast.error("GitHub 연동 중 오류가 발생했습니다.", { description: searchParams.get("error")! });
            router.replace(`/projects/${projectId}/settings`);
        }
    }, [searchParams, projectId, router]);

    useEffect(() => {
        if (pat) {
            setIsLoadingRepos(true);
            getGithubRepos(projectId).then(data => {
                setRepos(data);
            }).finally(() => {
                setIsLoadingRepos(false);
            });
        }
    }, [pat, projectId]);

    const handleConnectOAuth = () => {
        window.location.href = `/api/github/auth?projectId=${projectId}`;
    };

    const handleSync = async () => {
        if (!repoUrl || !pat) {
            toast.error("레포지토리 주소와 PAT를 모두 입력해주세요.");
            return;
        }
        
        if (isSyncing) return;
        setIsSyncing(true);
        
        try {
            // Save to DB
            await updateProjectGithubSettings(projectId, repoUrl, pat);
            
            // Artificial delay to show "syncing" UI
            await new Promise((resolve) => setTimeout(resolve, 1500));
    
            toast.success("GitHub 설정이 저장되었습니다!", {
                description: "이제부터 커밋과 PR 기록이 동기화됩니다."
            });
        } catch (error) {
            toast.error("연동에 실패했습니다. 설정을 다시 확인해주세요.");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-5 relative z-10 bg-background/40 backdrop-blur-sm p-5 border border-border/50 rounded-2xl">
            {pat ? (
                <>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-semibold flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-primary/70" /> 대상 레포지토리 (Repository URL)
                        </label>
                        {isLoadingRepos ? (
                            <div className="h-11 flex items-center px-4 text-sm text-muted-foreground border border-border/60 rounded-xl bg-background shadow-inner animate-pulse">레포지토리 목록 불러오는 중...</div>
                        ) : repos.length > 0 ? (
                            <select
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                className="px-4 py-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono shadow-inner"
                            >
                                <option value="" disabled>연동할 레포지토리를 선택하세요</option>
                                {repos.map((repo: any) => (
                                    <option key={repo.id} value={repo.url}>{repo.name} {repo.private ? '(Private)' : ''}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="https://github.com/agency/project-repo"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                className="px-4 py-3 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono shadow-inner"
                            />
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-3 mt-1">
                            <button
                                onClick={handleSync}
                                disabled={isSyncing || !repoUrl}
                                className="flex-1 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none whitespace-nowrap"
                            >
                                <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? '저장 중...' : '저장 및 연동'}
                            </button>
                            <button
                                onClick={handleConnectOAuth}
                                className="px-5 py-3 bg-muted text-foreground font-bold text-sm rounded-xl hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
                                title="다른 계정으로 재연동"
                            >
                                <Github className="w-4 h-4" /> 변경
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Github className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">GitHub 계정 연결점</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">Commitly가 개발 내역을 분석할 수 있도록 개발사의 소스코드가 있는 GitHub 계정을 연결해주세요.</p>
                    </div>
                    <button
                        onClick={handleConnectOAuth}
                        className="px-8 py-3.5 bg-[#24292e] text-white hover:bg-[#1b1f23] font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-3 mt-2"
                    >
                        <Github className="w-5 h-5" />
                        GitHub으로 계속하기
                    </button>
                </div>
            )}

            {pat && (
                <div className="flex items-start gap-2 mt-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-[11px] text-blue-500/80 leading-relaxed">
                        <p className="font-bold mb-1">수동 웹훅(Webhook) 등록 안내</p>
                        <p>위 저장소 권한 연동 후, GitHub [Settings] {'>'} [Webhooks]에서 아래 URL을 <strong>Payload URL</strong>로 등록해주세요.</p>
                        <code className="block w-full mt-2 p-1.5 bg-background/50 rounded border border-blue-500/20 text-blue-600 font-mono text-[10px] break-all select-all">
                            https://commitly-trust-layer.lovable.app/api/github/webhook
                        </code>
                        <p className="mt-1">Content type은 <code>application/json</code>을 선택하고, Events는 <code>Pull requests</code>와 <code>Pushes</code>를 체크하세요.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
