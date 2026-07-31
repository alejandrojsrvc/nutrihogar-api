import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { RecipeRepository } from '../../application/ports/recipe-repository.port';
import { Recipe } from '../../domain/entities/recipe';
import { PrismaRecipeMapper, recipeInclude } from './prisma-recipe.mapper';

@Injectable()
export class PrismaRecipeRepository implements RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Recipe | null> {
    const record = await this.prisma.recipe.findUnique({ where: { id }, include: recipeInclude });
    return record ? PrismaRecipeMapper.toDomain(record) : null;
  }

  async findByIdForHousehold(id: string, householdId: string): Promise<Recipe | null> {
    const record = await this.prisma.recipe.findFirst({
      where: { id, householdId },
      include: recipeInclude,
    });
    return record ? PrismaRecipeMapper.toDomain(record) : null;
  }

  async existsByName(householdId: string, name: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.recipe.findFirst({
      where: {
        householdId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return record !== null;
  }

  async save(recipe: Recipe): Promise<void> {
    const data = PrismaRecipeMapper.toPersistence(recipe);
    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.recipe.findUnique({
        where: { id: data.id },
        select: { id: true },
      });
      const recipeData = {
        householdId: data.householdId,
        createdById: data.createdById,
        name: data.name,
        description: data.description,
        category: data.category,
        defaultServings: data.defaultServings,
        estimatedPreparationMinutes: data.estimatedPreparationMinutes,
        tags: data.tags,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      } satisfies Prisma.RecipeUncheckedCreateInput;
      const ingredients = data.ingredients.map((ingredient) => ({
        id: ingredient.id,
        foodId: ingredient.foodId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servingId: ingredient.servingId,
        position: ingredient.position,
        notes: ingredient.notes,
      }));
      const instructions = data.instructions.map((instruction) => ({
        id: instruction.id,
        position: instruction.position,
        description: instruction.description,
      }));

      if (!existing) {
        await transaction.recipe.create({
          data: {
            id: data.id,
            ...recipeData,
            ingredients: { create: ingredients },
            instructions: { create: instructions },
          },
        });
        return;
      }

      await transaction.recipe.update({
        where: { id: data.id },
        data: {
          ...recipeData,
          ingredients: { deleteMany: {}, create: ingredients },
          instructions: { deleteMany: {}, create: instructions },
        },
      });
    });
  }
}
