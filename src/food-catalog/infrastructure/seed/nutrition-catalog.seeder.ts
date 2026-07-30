import { Prisma } from '@prisma/client';
import {
  FOOD_CATEGORIES,
  NUTRIENT_DEFINITIONS,
  NUTRITION_CATALOG_FOODS,
  NutrientCode,
} from './nutrition-catalog.data';

export async function seedNutritionCatalog(transaction: Prisma.TransactionClient): Promise<void> {
  const categoryIds = new Map<string, string>();
  for (const category of FOOD_CATEGORIES) {
    const persistedCategory = await transaction.foodCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        displayOrder: category.displayOrder,
        isActive: true,
      },
      create: {
        code: category.code,
        name: category.name,
        displayOrder: category.displayOrder,
        isActive: true,
      },
    });
    categoryIds.set(category.code, persistedCategory.id);
  }

  const nutrientIds = new Map<NutrientCode, string>();
  for (const nutrient of NUTRIENT_DEFINITIONS) {
    const persistedNutrient = await transaction.nutrientDefinition.upsert({
      where: { code: nutrient.code },
      update: {
        name: nutrient.name,
        unit: nutrient.unit,
        group: nutrient.group,
        displayOrder: nutrient.displayOrder,
        isRequired: nutrient.isRequired,
      },
      create: nutrient,
    });
    nutrientIds.set(nutrient.code, persistedNutrient.id);
  }

  for (const food of NUTRITION_CATALOG_FOODS) {
    const categoryId = categoryIds.get(food.categoryCode);
    if (!categoryId) {
      throw new Error(`Missing category ${food.categoryCode} for ${food.name}.`);
    }

    const nutrients = nutrientEntries(food.nutrients).map(([code, amount]) => {
      const nutrientDefinitionId = nutrientIds.get(code);
      if (!nutrientDefinitionId) {
        throw new Error(`Missing nutrient definition ${code} for ${food.name}.`);
      }

      return { nutrientDefinitionId, amount };
    });
    const servings = food.servings ?? [];
    const aliases = (food.aliases ?? []).map((alias) => ({ alias }));
    const baseData = {
      householdId: null,
      name: food.name,
      brand: null,
      description: food.description,
      categoryId,
      foodType: food.foodType,
      preparationState: food.preparationState,
      referenceQuantity: food.referenceQuantity,
      referenceUnit: food.referenceUnit,
      source: food.source,
      sourceReference: food.sourceReference,
      confidenceLevel: food.confidenceLevel,
      isGlobal: true,
      isActive: true,
      createdById: null,
      deletedAt: null,
    };

    await transaction.food.upsert({
      where: {
        source_sourceReference: {
          source: food.source,
          sourceReference: food.sourceReference,
        },
      },
      update: {
        ...baseData,
        nutrients: {
          deleteMany: {},
          create: nutrients,
        },
        servings: {
          deleteMany: {},
          create: servings,
        },
        aliases: {
          deleteMany: {},
          create: aliases,
        },
      },
      create: {
        ...baseData,
        nutrients: { create: nutrients },
        servings: { create: servings },
        aliases: { create: aliases },
      },
    });
  }
}

function nutrientEntries(nutrients: Record<NutrientCode, number>): [NutrientCode, number][] {
  return Object.entries(nutrients) as [NutrientCode, number][];
}
