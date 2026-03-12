import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const projects = await prisma.project.findMany({
    where: { githubRepoUrl: { not: null } },
    select: { id: true, name: true, githubRepoUrl: true }
  });
  console.log('Projects with Repo URLs:', JSON.stringify(projects, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
