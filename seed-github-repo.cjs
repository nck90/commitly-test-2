const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst({
    where: { status: 'active' }
  });

  if (!project) {
    console.log("No active projects found.");
    return;
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      githubRepoUrl: "https://github.com/commitly/trust-layer-core"
    }
  });

  console.log(`Updated Project ${updated.name} (${updated.id}) with GitHub Repo URL.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
