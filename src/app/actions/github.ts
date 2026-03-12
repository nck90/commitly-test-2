"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getGithubRepos(projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !(project as any).githubToken) return [];

    try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: {
                Authorization: `Bearer ${(project as any).githubToken}`,
                Accept: 'application/vnd.github.v3+json',
            }
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Token invalid or expired
                await prisma.project.update({ where: { id: projectId }, data: { githubToken: null } as any });
            }
            return [];
        }

        const data = await res.json();
        return data.map((repo: any) => ({
            id: repo.id,
            name: repo.full_name,
            url: repo.html_url,
            private: repo.private
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}
