import { Injectable } from '@nestjs/common';
import { FoodType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateCustomFoodInput,
  FoodCatalogUnitOfWork,
  UpdateCustomFoodInput,
} from '../../application/ports/food-catalog-mutation.port';

@Injectable()
export class PrismaFoodCatalogUnitOfWork implements FoodCatalogUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomFoodInput): Promise<string> {
    const food = await this.prisma.$transaction((transaction) =>
      transaction.food.create({
        data: {
          householdId: input.householdId,
          name: input.name,
          brand: input.brand,
          description: input.description,
          categoryId: input.categoryId,
          foodType: FoodType.CUSTOM,
          preparationState: input.preparationState,
          referenceQuantity: input.referenceQuantity,
          referenceUnit: input.referenceUnit,
          source: input.source,
          confidenceLevel: input.confidenceLevel,
          isGlobal: false,
          createdById: input.createdById,
          nutrients: { create: input.nutrients },
          servings: { create: input.servings },
        },
        select: { id: true },
      }),
    );

    return food.id;
  }

  async update(foodId: string, input: UpdateCustomFoodInput): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.food.updateMany({
        where: mutableFoodWhere(foodId),
        data: {
          name: input.name,
          brand: input.brand,
          description: input.description,
          categoryId: input.categoryId,
          preparationState: input.preparationState,
          referenceQuantity: input.referenceQuantity,
          referenceUnit: input.referenceUnit,
          source: input.source,
          confidenceLevel: input.confidenceLevel,
        },
      });

      if (result.count === 0) return;

      if (input.nutrients !== undefined) {
        await transaction.foodNutrient.deleteMany({ where: { foodId } });
        if (input.nutrients.length > 0) {
          await transaction.foodNutrient.createMany({
            data: input.nutrients.map((nutrient) => ({ foodId, ...nutrient })),
          });
        }
      }

      if (input.servings !== undefined) {
        await transaction.foodServing.deleteMany({ where: { foodId } });
        if (input.servings.length > 0) {
          await transaction.foodServing.createMany({
            data: input.servings.map((serving) => ({ foodId, ...serving })),
          });
        }
      }
    });
  }

  async softDelete(foodId: string, deletedAt: Date): Promise<void> {
    await this.prisma.food.updateMany({
      where: mutableFoodWhere(foodId),
      data: { isActive: false, deletedAt },
    });
  }
}

function mutableFoodWhere(foodId: string): Prisma.FoodWhereInput {
  return {
    id: foodId,
    householdId: { not: null },
    foodType: { in: [FoodType.CUSTOM, FoodType.COMMERCIAL] },
    isGlobal: false,
    isActive: true,
    deletedAt: null,
  };
}
