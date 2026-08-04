import { PrismaClient } from '@prisma/client';
import { seedNutritionCatalog } from '../src/food-catalog/infrastructure/seed/nutrition-catalog.seeder';
import { seedGlobalRecipes } from '../src/recipes/infrastructure/seed/global-recipes.seeder';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$transaction(
    async (transaction) => {
      await transaction.technicalSeed.upsert({
        where: { key: 'local-environment' },
        update: {},
        create: { key: 'local-environment' },
      });
      await seedNutritionCatalog(transaction);
      await seedGlobalRecipes(transaction);
    },
    {
      maxWait: 15_000,
      timeout: 120_000,
    },
  );
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo ejecutar el seed de Prisma.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
