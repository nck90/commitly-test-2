"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function createProjectWithScope(formData: FormData) {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const rawDocument = formData.get("document") as string;
    const files = formData.getAll("files") as File[];
    const partnerEmail = formData.get("partnerEmail") as string;
    const parsedFeaturesRaw = formData.get("parsedFeatures") as string;
    const parsedMilestonesRaw = formData.get("parsedMilestones") as string;
    let parsedFeatures: string[] = [];
    let parsedMilestones: { title: string; description: string; weekOffset: number }[] = [];
    if (parsedFeaturesRaw) {
        try {
            parsedFeatures = JSON.parse(parsedFeaturesRaw);
        } catch (e) {
            console.error("Failed to parse features array");
        }
    }
    if (parsedMilestonesRaw) {
        try {
            parsedMilestones = JSON.parse(parsedMilestonesRaw);
        } catch (e) {
            console.error("Failed to parse milestones array");
        }
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Fix for stale sessions after DB seed / missing OAuth users
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
        await prisma.user.create({
            data: {
                id: userId,
                email: session.user.email || `recovered-${Date.now()}@demo.com`,
                name: session.user.name || 'Recovered User',
                role: role || 'client'
            }
        });
    }

    const workspace = await prisma.workspace.create({
        data: { name: `${(session.user as any).name || 'My'} Workspace` }
    });

    // Handle Partner Invitation
    let clientId = role === 'client' ? userId : null;
    let agencyId = role === 'developer' ? userId : null;
    let partnerToInviteId: string | null = null;

    if (partnerEmail && role === 'client') {
        let partner = await prisma.user.findUnique({ where: { email: partnerEmail } });
        if (!partner) {
            partner = await prisma.user.create({
                data: {
                    email: partnerEmail,
                    name: partnerEmail.split('@')[0],
                    role: 'developer'
                }
            });
        }
        // Do NOT set agencyId immediately. Create a ProjectInvite instead later.
        partnerToInviteId = partner.id;
    }

    // 1. Create the project
    const project = await prisma.project.create({
        data: {
            name,
            description,
            workspaceId: workspace.id,
            clientId,
            agencyId,
            status: "active",
            healthScore: 100
        }
    });

    // 1-1. Create Project Invite if partner was specified
    if (partnerToInviteId) {
        await prisma.projectInvite.create({
            data: {
                projectId: project.id,
                agencyId: partnerToInviteId,
                status: "PENDING"
            }
        });
    }

    // 2. Save Document/Scope text (only if no files uploaded to avoid duplication)
    if (rawDocument && (!files || files.length === 0)) {
        await prisma.scopeDoc.create({
            data: {
                projectId: project.id,
                type: "contract",
                title: "초기 계약 및 요구사항 명세",
                textContent: rawDocument
            }
        });
    }

    // 3. Save Uploaded Files
    if (files && files.length > 0) {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const filePath = path.join(uploadDir, safeName);
            
            fs.writeFileSync(filePath, buffer);

            await prisma.scopeDoc.create({
                data: {
                    projectId: project.id,
                    type: "contract",
                    title: file.name,
                    contentUrl: `/uploads/${safeName}`
                }
            });
        }
    }

    // 4. REAL: Save AI Extracted Features
    // If AI successfully parsed features, use them. Otherwise, leave it empty for dashboard locking.
    if (parsedFeatures && parsedFeatures.length > 0) {
        const featureData = parsedFeatures.map((featName, idx) => ({
            projectId: project.id,
            name: featName,
            status: "not_started",
            sortOrder: idx + 1
        }));
        await prisma.feature.createMany({ data: featureData });
    }

    // 5. Create AI-extracted or empty Milestones
    if (parsedMilestones && parsedMilestones.length > 0) {
        const today = new Date();
        const milestoneData = parsedMilestones.map((ms, idx) => {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + (ms.weekOffset || 0) * 7);
            return {
                projectId: project.id,
                title: ms.title,
                description: ms.description || '',
                amount: 0,
                targetDate,
                status: idx === 0 ? 'pending' : 'upcoming',
                sortOrder: idx + 1
            };
        });
        await prisma.milestone.createMany({ data: milestoneData });
    }
    // 마일스톤이 없으면 빈 상태로 두어 타임라인 페이지에서 안내 화면 표시

    revalidatePath("/");
    return project.id;
}

export async function uploadProjectDocuments(formData: FormData) {
    const projectId = formData.get("projectId") as string;
    const rawDocument = formData.get("document") as string;
    const files = formData.getAll("files") as File[];
    const parsedFeaturesRaw = formData.get("parsedFeatures") as string;
    const parsedMilestonesRaw = formData.get("parsedMilestones") as string;
    
    let parsedFeatures: string[] = [];
    let parsedMilestones: { title: string; description: string; weekOffset: number }[] = [];
    
    if (parsedFeaturesRaw) {
        try { parsedFeatures = JSON.parse(parsedFeaturesRaw); } catch (e) {}
    }
    if (parsedMilestonesRaw) {
        try { parsedMilestones = JSON.parse(parsedMilestonesRaw); } catch (e) {}
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    // 1. Save Document/Scope text
    if (rawDocument && (!files || files.length === 0)) {
        await prisma.scopeDoc.create({
            data: {
                projectId,
                type: "contract",
                title: "추가 문서 및 요구사항 명세",
                textContent: rawDocument
            }
        });
    }

    // 2. Save Uploaded Files
    if (files && files.length > 0) {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const filePath = path.join(uploadDir, safeName);
            
            fs.writeFileSync(filePath, buffer);

            await prisma.scopeDoc.create({
                data: {
                    projectId,
                    type: "contract",
                    title: file.name,
                    contentUrl: `/uploads/${safeName}`
                }
            });
        }
    }

    // 3. Save AI Extracted Features
    if (parsedFeatures && parsedFeatures.length > 0) {
        const featureData = parsedFeatures.map((featName, idx) => ({
            projectId,
            name: featName,
            status: "not_started",
            sortOrder: idx + 1
        }));
        await prisma.feature.createMany({ data: featureData });
    }

    // 4. Save AI Extracted Milestones
    if (parsedMilestones && parsedMilestones.length > 0) {
        const today = new Date();
        const milestoneData = parsedMilestones.map((ms, idx) => {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + (ms.weekOffset || 0) * 7);
            return {
                projectId,
                title: ms.title,
                description: ms.description || '',
                amount: 0,
                targetDate,
                status: idx === 0 ? 'pending' : 'upcoming',
                sortOrder: idx + 1
            };
        });
        await prisma.milestone.createMany({ data: milestoneData });
    }

    revalidatePath(`/projects/${projectId}`);
    return projectId;
}

export async function updateFeatureStatus(featureId: string, status: string, progressPercentage?: number) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const feature = await prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) throw new Error("Feature not found");

    await prisma.feature.update({
        where: { id: featureId },
        data: {
            status,
            ...(progressPercentage !== undefined ? { progressPercentage } : {})
        }
    });

    revalidatePath(`/projects/${feature.projectId}/features`);
    // Also revalidate dashboard to reflect progress changes
    revalidatePath(`/projects/${feature.projectId}`);
}

export async function updateProjectGithubSettings(projectId: string, githubRepoUrl: string, githubToken: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    await prisma.project.update({
        where: { id: projectId },
        data: {
            githubRepoUrl,
            githubToken
        }
    });

    revalidatePath(`/projects/${projectId}/settings`);
    return true;
}

export async function cancelInvite(inviteId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const invite = await prisma.projectInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new Error("Invite not found");

    await prisma.projectInvite.delete({ where: { id: inviteId } });

    revalidatePath(`/projects/${invite.projectId}/settings`);
    revalidatePath("/");
    return true;
}

export async function detachPartner(projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    // Only Client can detach
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");
    if (project.clientId !== (session.user as any).id) throw new Error("Only clients can detach partners");

    await prisma.project.update({
        where: { id: projectId },
        data: { agencyId: null }
    });

    // Also remove any existing invitations for this project to keep it clean
    await prisma.projectInvite.deleteMany({
        where: { projectId }
    });

    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath(`/projects/${projectId}`);
    return true;
}

export async function invitePartner(projectId: string, email: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");
    if (project.clientId !== (session.user as any).id) throw new Error("Only clients can invite partners");

    // Find or create user
    let partner = await prisma.user.findUnique({ where: { email } });
    if (!partner) {
        partner = await prisma.user.create({
            data: {
                email,
                name: email.split('@')[0],
                role: 'developer'
            }
        });
    }

    // Create invite
    await prisma.projectInvite.create({
        data: {
            projectId,
            agencyId: partner.id,
            status: "PENDING"
        }
    });

    revalidatePath(`/projects/${projectId}/settings`);
    return true;
}
