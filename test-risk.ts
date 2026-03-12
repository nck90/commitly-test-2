import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const risks = await prisma.risk.findMany();
  console.log('Risks in DB:', risks);
}
main().catch(console.error).finally(() => prisma.$disconnect());
