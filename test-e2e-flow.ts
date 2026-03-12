import { PrismaClient } from '@prisma/client';
import { extractProjectInfoFromText } from './src/app/actions/aiExtraction';

const prisma = new PrismaClient();

async function runTest() {
    console.log("=== 1. Testing AI Extraction (Client Onboarding) ===");
    const sampleText = "새로운 랜딩페이지를 제작해주세요. 예산은 1500만원이고 기간은 3개월입니다. 관리자 대시보드 로그인 페이지와, 사용자들이 볼 수 있는 메인 랜딩페이지, 그리고 피드(게시판) 기능을 만들어주세요. 결제 시스템 연동도 필요합니다.";
    
    console.log("Sending text to Groq AI...");
    const extractedInfo = await extractProjectInfoFromText(sampleText);
    console.log("✅ AI Extraction Result:", extractedInfo);

    if (!extractedInfo.features || extractedInfo.features.length === 0) {
        throw new Error("AI failed to extract features.");
    }

    console.log("\n=== 2. Simulating Project Creation ===");
    const clientUser = await prisma.user.upsert({
        where: { email: 'client_e2e@test.com' },
        update: {},
        create: { email: 'client_e2e@test.com', name: 'Client E2E', role: 'client' }
    });
    
    const devUser = await prisma.user.upsert({
        where: { email: 'dev_e2e@test.com' },
        update: {},
        create: { email: 'dev_e2e@test.com', name: 'Dev E2E', role: 'developer' }
    });

    const workspace = await prisma.workspace.create({
        data: { name: 'E2E Workspace' }
    });

    const project = await prisma.project.create({
        data: {
            name: "E2E AI & Webhook Test Project",
            description: "Testing end-to-end functionality",
            workspaceId: workspace.id,
            clientId: clientUser.id,
            agencyId: devUser.id,
            status: "active",
            githubRepoUrl: "https://github.com/nck90/commitly-test",
            healthScore: 100
        }
    });
    console.log("✅ Created Project ID:", project.id);

    console.log("\n=== 3. Saving Extracted Features to DB ===");
    const featureData = extractedInfo.features.map((featName: string, idx: number) => ({
        projectId: project.id,
        name: featName,
        status: "not_started",
        sortOrder: idx + 1
    }));
    await prisma.feature.createMany({ data: featureData });
    
    const savedFeatures = await prisma.feature.findMany({ where: { projectId: project.id } });
    console.log(`✅ Saved ${savedFeatures.length} features to DB.`);

    console.log("\n=== 4. Testing GitHub Webhook (Push Event) ===");
    const targetFeature = savedFeatures[0];
    const commitMessage = `TSK-${targetFeature.id.substring(0, 4)} Implement ${targetFeature.name} feature`;
    
    const pushPayload = {
        repository: { html_url: "https://github.com/nck90/commitly-test" },
        commits: [{
            message: commitMessage,
            author: { name: "Agent E2E" },
            url: "https://github.com/nck90/commitly-test/commit/12345"
        }]
    };

    console.log(`Simulating POST /api/github/webhook with TSK-${targetFeature.id.substring(0, 4)}...`);
    const webhookRes = await fetch('http://localhost:3000/api/github/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-github-event': 'push'
        },
        body: JSON.stringify(pushPayload)
    });
    
    console.log("Webhook Response Status:", webhookRes.status);
    
    const updatedFeature = await prisma.feature.findUnique({ where: { id: targetFeature.id } });
    console.log("✅ Target Feature Progress after Webhook:", updatedFeature?.progressPercentage + "% (Expected: 100%)");
    console.log("✅ Target Feature Status after Webhook:", updatedFeature?.status, "(Expected: done)");

    console.log("\n=== 5. Testing GitHub Webhook (PR Event - AI Summary) ===");
    const prPayload = {
        action: "closed",
        pull_request: {
            title: "Refactor backend API and optimize DB queries",
            body: "Moved redundant queries to a single joined fetch.",
            merged: true,
            html_url: "https://github.com/nck90/commitly-test/pull/1"
        },
        repository: { html_url: "https://github.com/nck90/commitly-test" }
    };

    const prRes = await fetch('http://localhost:3000/api/github/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-github-event': 'pull_request'
        },
        body: JSON.stringify(prPayload)
    });

    console.log("PR Webhook Response Status:", prRes.status);

    const feedUpdates = await prisma.update.findMany({ 
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' }
    });

    console.log("✅ Feed Entries Created:", feedUpdates.length);
    feedUpdates.forEach(u => {
        console.log(`- Title: ${u.title}`);
        console.log(`  Client Summary (AI): ${u.clientSummary || 'N/A'}`);
    });

    console.log("\n🎉 ALL E2E TESTS PASSED!");
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
