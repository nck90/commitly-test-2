import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import prisma from "@/lib/prisma";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProjectInvitesClient } from "./ProjectInvitesClient";

export default async function Home() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    let projects: any[] = [];
    let pendingInvites: any[] = [];
    
    if (userId && role) {
        projects = await prisma.project.findMany({
            where: role === 'client' ? { clientId: userId } : { agencyId: userId },
            orderBy: { createdAt: "desc" }
        });
        
        if (role === 'developer') {
            pendingInvites = await prisma.projectInvite.findMany({
                where: { agencyId: userId, status: "PENDING" },
                include: {
                    project: {
                        include: {
                            client: { select: { name: true, email: true } }
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });
        }
    }

    return (
        <main className="min-h-screen bg-background flex flex-col items-center p-8 lg:p-16">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">내 프로젝트</h1>
                        <p className="mt-2 text-muted-foreground">
                            Commitly를 통해 관리되고 있는 프로젝트 목록입니다.
                        </p>
                    </div>
                    {role === 'client' && (
                        <Link
                            href="/projects/new"
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            새 프로젝트 생성
                        </Link>
                    )}
                </div>

                <ProjectInvitesClient invites={pendingInvites} />

                {projects.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-3xl bg-card">
                        <div className="w-16 h-16 bg-accent/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FolderKanban className="h-8 w-8 text-muted-foreground/60" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">프로젝트가 없습니다</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {role === 'client' 
                                ? '첫 번째 프로젝트를 생성하고 범위를 설정해 보세요.' 
                                : '아직 참여 중인 프로젝트가 없습니다. 초대를 기다려 주세요.'}
                        </p>
                        {role === 'client' && (
                            <Link
                                href="/projects/new"
                                className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                생성하기
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Link key={project.id} href={`/projects/${project.id}`}>
                                <div className="p-6 border rounded-2xl bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                                            {project.name.charAt(0)}
                                        </div>
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            {project.status === 'active' ? '진행 중' : project.status}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{project.description || '설명이 없습니다.'}</p>

                                    <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                                        <span>헬스 스코어: {project.healthScore}점</span>
                                        <span>{new Date(project.createdAt).toLocaleDateString()} 생성</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
