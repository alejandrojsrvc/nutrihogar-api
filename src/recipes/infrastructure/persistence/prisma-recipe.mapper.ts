import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeProps } from '../../domain/models/recipe.models';

export const recipeInclude = {
  ingredients: { orderBy: { position: 'asc' } },
  instructions: { orderBy: { position: 'asc' } },
} satisfies Prisma.RecipeInclude;

export type RecipeRecord = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;

export class PrismaRecipeMapper {
  static toDomain(record: RecipeRecord): Recipe {
    const props: RecipeProps = {
      id: record.id,
      householdId: record.householdId,
      createdById: record.createdById,
      name: record.name,
      description: record.description,
      category: record.category,
      defaultServings: record.defaultServings,
      estimatedPreparationMinutes: record.estimatedPreparationMinutes,
      tags: record.tags,
      status: record.status,
      isGlobal: record.isGlobal,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      ingredients: record.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        quantity: new Decimal(ingredient.quantity.toString()),
        unit: ingredient.unit,
        servingId: ingredient.servingId,
        position: ingredient.position,
        notes: ingredient.notes,
      })),
      instructions: record.instructions.map((instruction) => ({
        id: instruction.id,
        position: instruction.position,
        description: instruction.description,
      })),
    };

    return Recipe.reconstitute(props);
  }

  static toPersistence(recipe: Recipe) {
    const props = recipe.toProps();
    return {
      id: props.id,
      householdId: props.householdId,
      createdById: props.createdById,
      name: props.name,
      description: props.description,
      category: props.category,
      defaultServings: props.defaultServings,
      estimatedPreparationMinutes: props.estimatedPreparationMinutes,
      tags: props.tags,
      status: props.status,
      isGlobal: props.isGlobal,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
      ingredients: props.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity.toString(),
        unit: ingredient.unit,
        servingId: ingredient.servingId,
        position: ingredient.position,
        notes: ingredient.notes,
      })),
      instructions: props.instructions,
    };
  }
}
