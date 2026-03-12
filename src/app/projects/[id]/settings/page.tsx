
import { SettingsIcon, Github, Bell, Shield, Key, AlertCircle, Code2, ShieldCheck, Eye, CheckCircle2, Scale } from "lucide-react";
import { NotificationToggle, GithubIntegrationPanel, PartnerManagementSection } from "./SettingsClient";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // Auth Check
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            agency: { select: { id: true, email: true, name: true } },
            invites: {
                where: { status: "PENDING" },
                include: { agency: { select: { id: true, email: true, name: true } } }
            }
        }
    });
    
    // Determine Role
    const isDeveloper = project?.agencyId === userId;
    const isClient = project?.clientId === userId;

    if (!project) return <div>Project not found</div>;

    return (
        <div className="max-w-4xl mx-auto py-8">

            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${isDeveloper ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                        {isDeveloper ? <><Code2 className="w-3 h-3" /> Developer Settings</> : <><ShieldCheck className="w-3 h-3" /> Client Settings</>}
                    </span>
                </div>
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <SettingsIcon className="w-6 h-6 text-primary" />
                    {isDeveloper ? '프로젝트 설정' : '알림 및 확인 설정'}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {isDeveloper ? '프로젝트 보안, 알림, 외부 연동 기능을 편하게 관리해요.' : '어떤 알림을 받을지, 확인 기준은 어떻게 할지 설정할 수 있어요.'}
                </p>
            </div>

            <div className="space-y-6">
                {/* 1. 알림 설정 — Both roles */}
                <div className="commitly-card p-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-primary" />
                        알림 센터
                    </h2>
                    <div className="space-y-4">
                        <details className="group [&_summary::-webkit-details-marker]:hidden bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div>
                                    <h3 className="font-bold text-sm">중요한 확인 요청 알림</h3>
                                    <p className="text-xs text-muted-foreground mt-1 group-open:hidden">클릭하면 알림 설정을 보실 수 있어요</p>
                                </div>
                                <span className="transform transition-transform duration-300 group-open:-rotate-180">
                                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </span>
                            </summary>
                            <div className="p-4 pt-0 text-sm">
                                <p className="text-muted-foreground mb-4">확인이 필요한 중요한 요청이 생기면 쥔시 알려드릴게요.</p>
                                <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border/40">
                                    <span className="font-medium text-xs">수신 활성화</span>
                                    <NotificationToggle id="toggle-critical" defaultChecked={true} />
                                </div>
                            </div>
                        </details>

                        <details className="group [&_summary::-webkit-details-marker]:hidden bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div>
                                    <h3 className="font-bold text-sm">주간 요약 알림</h3>
                                    <p className="text-xs text-muted-foreground mt-1 group-open:hidden">클릭하면 알림 설정을 보실 수 있어요</p>
                                </div>
                                <span className="transform transition-transform duration-300 group-open:-rotate-180">
                                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </span>
                            </summary>
                            <div className="p-4 pt-0 text-sm">
                                <p className="text-muted-foreground mb-4">매주 금요일에 이번 주 진행 상황을 요약해서 보내드릴게요.</p>
                                <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border/40">
                                    <span className="font-medium text-xs">수신 활성화</span>
                                    <NotificationToggle id="toggle-weekly" defaultChecked={true} />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                {/* 1-2. 알림 채널 확장 — Both roles */}
                <div className="commitly-card p-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-primary" />
                        알림 채널 설정
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">어떤 방법으로 알림을 받으실지 선택해 주세요.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📧</span>
                                <div>
                                    <h3 className="font-bold text-sm">이메일</h3>
                                    <p className="text-[10px] text-muted-foreground">기본 채널이에요</p>
                                </div>
                            </div>
                            <div className="w-10 h-6 bg-success rounded-full relative">
                                <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">💬</span>
                                <div>
                                    <h3 className="font-bold text-sm">Slack</h3>
                                    <p className="text-[10px] text-muted-foreground">곧 지원 예정이에요</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Coming Soon</span>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">💛</span>
                                <div>
                                    <h3 className="font-bold text-sm">카카오톡</h3>
                                    <p className="text-[10px] text-muted-foreground">곧 지원 예정이에요</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Coming Soon</span>
                        </div>
                    </div>
                </div>

                {/* 2. CLIENT ONLY: 검수 기준 설정 */}
                {!isDeveloper && (
                    <div className="commitly-card p-6 border-l-4 border-l-emerald-500">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            확인 방식 설정
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            개발팀의 결과물을 어떤 방식으로 확인할지 편하게 설정해 주세요.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                                <div>
                                    <h3 className="font-bold text-sm">자동 확인 시간</h3>
                                    <p className="text-xs text-muted-foreground mt-1">확인을 안 하시면 이 시간 후에 자동 확인돼요</p>
                                </div>
                                <select className="px-3 py-2 bg-background border border-border/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none">
                                    <option>24시간</option>
                                    <option>48시간</option>
                                    <option>72시간</option>
                                    <option>수동 확인만</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                                <div>
                                    <h3 className="font-bold text-sm">수정 요청 알림 강도</h3>
                                    <p className="text-xs text-muted-foreground mt-1">수정을 요청할 때 개발팀에게 어떤 강도로 알려줄까요?</p>
                                </div>
                                <select className="px-3 py-2 bg-background border border-border/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none">
                                    <option>긴급 (알림 + 이메일 + SMS)</option>
                                    <option>보통 (알림 + 이메일)</option>
                                    <option>낮음 (알림만)</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                                <div>
                                    <h3 className="font-bold text-sm">결과물 품질 수준</h3>
                                    <p className="text-xs text-muted-foreground mt-1">AI가 결과물을 자동으로 검토할 때의 기준이에요</p>
                                </div>
                                <select className="px-3 py-2 bg-background border border-border/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none">
                                    <option>높음 (서류와 코드까지 꼼꼼히)</option>
                                    <option>보통 (서류만 확인)</option>
                                    <option>간단히 (형식만 검사)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PARTNER MANAGEMENT — Client only */}
                {isClient && (
                    <PartnerManagementSection 
                        projectId={id} 
                        agency={(project as any).agency} 
                        invites={(project as any).invites} 
                    />
                )}

                {/* 4. DEVELOPER ONLY: GitHub Integration */}
                {isDeveloper && (
                    <div className="commitly-card p-6 border-l-4 border-l-primary relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12 group-hover:opacity-10">
                            <Github className="w-48 h-48" />
                        </div>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <span className="p-2 bg-primary/10 rounded-lg text-primary"><Github className="w-5 h-5" /></span>
                                    GitHub 연동 관리
                                </h2>
                                <p className="text-xs text-muted-foreground mt-2 max-w-md leading-relaxed">
                                    개발 저장소의 커밋 기록과 PR 로그를 자동으로 분석해 프로젝트 변경 기록으로 실시간 동기화해요.
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="px-3 py-1 bg-gradient-to-r from-primary/20 to-primary/5 text-primary font-bold text-xs rounded-full border border-primary/20 shadow-sm">
                                    Pro Feature
                                </span>
                                {project?.agencyId === userId && (project as any).githubToken ? (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 border border-success/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                        <span className="text-[10px] font-bold text-success uppercase tracking-wider">Connected</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted border border-border">
                                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disconnected</span>
                                    </div>
                                )}
                            </div>
                        </div>
 
                        <GithubIntegrationPanel 
                            projectId={id} 
                            initialRepoUrl={(project as any).githubRepoUrl} 
                            initialToken={(project as any).githubToken} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
