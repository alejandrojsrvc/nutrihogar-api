import { Injectable } from '@nestjs/common';
import { HouseholdMembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  FindVisibleNutritionFoodQuery,
  NutritionFoodRepository,
} from '../../application/ports/nutrition-food-repository.port';
import { NutritionFoodData } from '../../domain/models/nutrition-engine.models';

const nutritionFoodInclude = {
  nutrients: { include: { nutrientDefinition: true } },
  servings: true,
} satisfies Prisma.FoodInclude;

type NutritionFoodRecord = Prisma.FoodGetPayload<{ include: typeof nutritionFoodInclude }>;

@Injectable()
export class PrismaNutritionFoodRepository implements NutritionFoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVisibleById(query: FindVisibleNutritionFoodQuery): Promise<NutritionFoodData | null> {
    const membership = await this.prisma.householdMembership.findFirst({
      where: {
        userId: query.actorId,
        householdId: query.householdId,
        status: HouseholdMembershipStatus.ACTIVE,
        household: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!membership) return null;

    const food = await this.prisma.food.findFirst({
      where: {
        id: query.foodId,
        isActive: true,
        deletedAt: null,
        OR: [
          { isGlobal: true, householdId: null },
          { isGlobal: false, householdId: query.householdId },
        ],
      },
      include: nutritionFoodInclude,
    });

    return food ? toNutritionFood(food) : null;
  }
}

function toNutritionFood(food: NutritionFoodRecord): NutritionFoodData {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    preparationState: food.preparationState,
    confidenceLevel: food.confidenceLevel,
    referenceQuantity: food.referenceQuantity.toString(),
    referenceUnit: food.referenceUnit,
    nutrients: food.nutrients.map(({ nutrientDefinition, amount }) => ({
      code: nutrientDefinition.code,
      name: nutrientDefinition.name,
      unit: nutrientDefinition.unit,
      amount: amount.toString(),
    })),
    servings: food.servings.map((serving) => ({
      id: serving.id,
      quantity: serving.quantity.toString(),
      equivalentGrams: serving.equivalentGrams?.toString() ?? null,
      equivalentMilliliters: serving.equivalentMilliliters?.toString() ?? null,
    })),
  };
}
