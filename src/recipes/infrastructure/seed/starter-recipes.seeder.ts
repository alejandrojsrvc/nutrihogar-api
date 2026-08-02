import { Prisma } from '@prisma/client';

type StarterIngredientUnit = 'GRAM' | 'MILLILITER' | 'UNIT';

export interface StarterRecipeDefinition {
  name: string;
  description: string;
  category: string;
  defaultServings: number;
  ingredients: Array<{
    source: string;
    sourceReference: string;
    quantity: number;
    unit: StarterIngredientUnit;
    servingName?: string;
  }>;
}

const USDA = 'USDA_FDC_SR_LEGACY';
const LOCAL = 'LOCAL_SEED';

export const STARTER_RECIPES: StarterRecipeDefinition[] = [
  {
    name: 'Arepa con huevos revueltos',
    description: 'Arepa sencilla con huevos revueltos.',
    category: 'DESAYUNO',
    defaultServings: 1,
    ingredients: [
      { source: LOCAL, sourceReference: 'LOCAL_SEED:AREPA_CORN_FLOUR', quantity: 60, unit: 'GRAM' },
      { source: USDA, sourceReference: '173647', quantity: 90, unit: 'MILLILITER' },
      {
        source: USDA,
        sourceReference: '171287',
        quantity: 2,
        unit: 'SERVING',
        servingName: 'Huevo grande',
      },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: '3 ml',
      },
    ],
  },
  {
    name: 'Arepa con jamon y queso',
    description: 'Arepa rellena con jamón cocido y queso.',
    category: 'DESAYUNO',
    defaultServings: 1,
    ingredients: [
      { source: LOCAL, sourceReference: 'LOCAL_SEED:AREPA_CORN_FLOUR', quantity: 60, unit: 'GRAM' },
      { source: USDA, sourceReference: '173647', quantity: 90, unit: 'MILLILITER' },
      { source: USDA, sourceReference: '167094', quantity: 40, unit: 'GRAM' },
      { source: USDA, sourceReference: '173414', quantity: 30, unit: 'GRAM' },
    ],
  },
  {
    name: 'Arroz con ensalada y bistec',
    description: 'Arroz blanco con ensalada fresca y bistec.',
    category: 'ALMUERZO',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '169757', quantity: 180, unit: 'GRAM' },
      { source: USDA, sourceReference: '168649', quantity: 120, unit: 'GRAM' },
      { source: USDA, sourceReference: '169247', quantity: 40, unit: 'GRAM' },
      { source: USDA, sourceReference: '170457', quantity: 60, unit: 'GRAM' },
      { source: USDA, sourceReference: '170000', quantity: 20, unit: 'GRAM' },
      { source: USDA, sourceReference: '171705', quantity: 40, unit: 'GRAM' },
    ],
  },
  {
    name: 'Arroz con pollo',
    description: 'Arroz blanco con pechuga de pollo.',
    category: 'ALMUERZO',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '169757', quantity: 180, unit: 'GRAM' },
      { source: USDA, sourceReference: '171477', quantity: 120, unit: 'GRAM' },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: '3 ml',
      },
    ],
  },
];

/** Call from the household-creation flow; prisma/seed.ts has no real user or household. */
export async function seedStarterRecipes(
  transaction: Prisma.TransactionClient,
  householdId: string,
  createdById: string,
): Promise<void> {
  const foods = new Map<string, string>();
  for (const recipe of STARTER_RECIPES) {
    for (const ingredient of recipe.ingredients) {
      const key = `${ingredient.source}:${ingredient.sourceReference}`;
      if (foods.has(key)) continue;
      const food = await transaction.food.findUnique({
        where: {
          source_sourceReference: {
            source: ingredient.source,
            sourceReference: ingredient.sourceReference,
          },
        },
        select: { id: true, servings: { select: { id: true, name: true } } },
      });
      if (!food) throw new Error(`Missing global food ${key} for starter recipes.`);
      foods.set(key, food.id);
      if (ingredient.servingName) {
        const serving = food.servings.find(
          (candidate) => candidate.name === ingredient.servingName,
        );
        if (!serving) throw new Error(`Missing serving ${ingredient.servingName} for ${key}.`);
        foods.set(`${key}:serving:${ingredient.servingName}`, serving.id);
      }
    }
  }

  for (const recipe of STARTER_RECIPES) {
    const ingredients = recipe.ingredients.map((ingredient, index) => ({
      foodId: foods.get(`${ingredient.source}:${ingredient.sourceReference}`)!,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      servingId: ingredient.servingName
        ? foods.get(
            `${ingredient.source}:${ingredient.sourceReference}:serving:${ingredient.servingName}`,
          )
        : null,
      position: index + 1,
    }));
    const existing = await transaction.recipe.findFirst({
      where: { householdId, name: recipe.name, tags: { has: 'starter' } },
      select: { id: true },
    });
    const recipeData = {
      householdId,
      createdById,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      defaultServings: recipe.defaultServings,
      estimatedPreparationMinutes: null,
      tags: ['starter', 'seed'],
      status: 'ACTIVE' as const,
      deletedAt: null,
    };

    if (existing) {
      await transaction.recipe.update({
        where: { id: existing.id },
        data: {
          ...recipeData,
          ingredients: { deleteMany: {}, create: ingredients },
          instructions: { deleteMany: {} },
        },
      });
    } else {
      await transaction.recipe.create({
        data: {
          ...recipeData,
          ingredients: { create: ingredients },
        },
      });
    }
  }
}
