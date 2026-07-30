import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.technicalSeed.upsert({
    where: { key: 'local-environment' },
    update: {},
    create: { key: 'local-environment' },
  });
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo ejecutar el seed de Prisma.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
