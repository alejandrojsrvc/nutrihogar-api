import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  RecipeListCriteria,
  RecipeListResult,
  RecipeRepository,
} from '../../application/ports/recipe-repository.port';
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
      where: { id, OR: [{ isGlobal: true }, { householdId }] },
      include: recipeInclude,
    });
    return record ? PrismaRecipeMapper.toDomain(record) : null;
  }

  async existsByName(householdId: string, name: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.recipe.findFirst({
      where: {
        householdId,
        isGlobal: false,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return record !== null;
  }

  async listByHousehold(
    householdId: string,
    criteria: RecipeListCriteria,
  ): Promise<RecipeListResult> {
    const where: Prisma.RecipeWhereInput = {
      OR: [{ isGlobal: true }, { householdId }],
      status: 'ACTIVE',
      ...(criteria.query ? { name: { contains: criteria.query, mode: 'insensitive' } } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        include: recipeInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    return {
      items: records.map((record) => PrismaRecipeMapper.toDomain(record)),
      page: criteria.page,
      limit: criteria.limit,
      total,
    };
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
        isGlobal: data.isGlobal,
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
