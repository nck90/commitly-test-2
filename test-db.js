const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const projects = await prisma.project.findMany({
    where: { githubRepoUrl: { not: null } },
    select: { id: true, name: true, githubRepoUrl: true }
  });
  console.log('Projects:', projects);

  const updates = await prisma.update.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, clientSummary: true, type: true },
    take: 3
  });
  console.log('Recent Updates:', updates);
}
main().catch(console.error).finally(() => prisma.$disconnect());
