import { Prisma } from '@prisma/client';

type GlobalIngredientUnit = 'GRAM' | 'MILLILITER' | 'UNIT' | 'SERVING';

export interface GlobalRecipeDefinition {
  name: string;
  description: string;
  category: string;
  defaultServings: number;
  ingredients: Array<{
    source: string;
    sourceReference: string;
    quantity: number;
    unit: GlobalIngredientUnit;
    servingName?: string;
  }>;
}

const USDA = 'USDA_FDC_SR_LEGACY';
const LOCAL = 'LOCAL_SEED';

export const GLOBAL_RECIPES: GlobalRecipeDefinition[] = [
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
  {
    name: 'Milanesa con pure de papa',
    description: 'Milanesa de carne con puré de papa.',
    category: 'ALMUERZO',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '171757', quantity: 150, unit: 'GRAM' },
      { source: USDA, sourceReference: '170440', quantity: 250, unit: 'GRAM' },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Cucharada',
      },
    ],
  },
  {
    name: 'Pollo al horno con papa',
    description: 'Pechuga de pollo al horno con papa.',
    category: 'ALMUERZO',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '171477', quantity: 200, unit: 'GRAM' },
      { source: USDA, sourceReference: '170093', quantity: 200, unit: 'GRAM' },
      { source: USDA, sourceReference: '169230', quantity: 2, unit: 'GRAM' },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Cucharadita',
      },
    ],
  },
  {
    name: 'Ensalada de lechuga, tomate y aguacate',
    description: 'Ensalada fresca con lechuga, tomate y aguacate.',
    category: 'CENA',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '169247', quantity: 50, unit: 'GRAM' },
      { source: USDA, sourceReference: '170457', quantity: 100, unit: 'GRAM' },
      { source: USDA, sourceReference: '170000', quantity: 20, unit: 'GRAM' },
      {
        source: USDA,
        sourceReference: '171705',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Medio aguacate',
      },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Cucharadita',
      },
    ],
  },
  {
    name: 'Guiso de carne molida con arroz',
    description: 'Guiso de carne molida con tomate y cebolla, acompañado de arroz.',
    category: 'ALMUERZO',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '174030', quantity: 100, unit: 'GRAM' },
      { source: USDA, sourceReference: '169757', quantity: 150, unit: 'GRAM' },
      { source: USDA, sourceReference: '170457', quantity: 50, unit: 'GRAM' },
      { source: USDA, sourceReference: '170000', quantity: 30, unit: 'GRAM' },
      { source: USDA, sourceReference: '169230', quantity: 2, unit: 'GRAM' },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Cucharadita',
      },
    ],
  },
  {
    name: 'Yogur con banana',
    description: 'Yogur natural con banana en rodajas.',
    category: 'MERIENDA',
    defaultServings: 1,
    ingredients: [
      { source: USDA, sourceReference: '171284', quantity: 200, unit: 'GRAM' },
      { source: USDA, sourceReference: '173944', quantity: 120, unit: 'GRAM' },
    ],
  },
  {
    name: 'Huevos revueltos con pan',
    description: 'Huevos revueltos con dos rebanadas de pan.',
    category: 'DESAYUNO',
    defaultServings: 1,
    ingredients: [
      {
        source: USDA,
        sourceReference: '171287',
        quantity: 2,
        unit: 'SERVING',
        servingName: 'Huevo grande',
      },
      {
        source: USDA,
        sourceReference: '174924',
        quantity: 2,
        unit: 'SERVING',
        servingName: 'Rebanada',
      },
      {
        source: USDA,
        sourceReference: '171413',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Cucharadita',
      },
    ],
  },
  {
    name: 'Tostadas de palta con huevo',
    description: 'Tostadas de pan con palta y huevo cocido.',
    category: 'DESAYUNO',
    defaultServings: 1,
    ingredients: [
      {
        source: USDA,
        sourceReference: '174924',
        quantity: 2,
        unit: 'SERVING',
        servingName: 'Rebanada',
      },
      {
        source: USDA,
        sourceReference: '171705',
        quantity: 1,
        unit: 'SERVING',
        servingName: 'Medio aguacate',
      },
      { source: USDA, sourceReference: '173424', quantity: 100, unit: 'GRAM' },
    ],
  },
];

/** Seeds the global recipe catalog. Called from prisma/seed.ts; global recipes have no household. */
export async function seedGlobalRecipes(transaction: Prisma.TransactionClient): Promise<void> {
  const foods = new Map<string, string>();
  for (const recipe of GLOBAL_RECIPES) {
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
      if (!food) throw new Error(`Missing global food ${key} for global recipes.`);
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

  for (const recipe of GLOBAL_RECIPES) {
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
      where: { isGlobal: true, name: recipe.name, tags: { has: 'global' } },
      select: { id: true },
    });
    const recipeData = {
      householdId: null,
      createdById: null,
      name: recipe.name,
      description: recipe.description,
      category: recipe.category,
      defaultServings: recipe.defaultServings,
      estimatedPreparationMinutes: null,
      tags: ['global', 'seed'],
      status: 'ACTIVE' as const,
      isGlobal: true,
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
