import { Injectable } from '@nestjs/common';
import { HouseholdMembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CategoryView,
  FoodDetailView,
  FoodNutrientView,
  FoodSummaryView,
  NutrientDefinitionView,
} from '../../application/models/food-catalog.models';
import {
  FoodCatalogReadRepository,
  SearchFoodsCriteria,
} from '../../application/ports/food-catalog-read-repository.port';

const summaryInclude = {
  category: true,
  nutrients: {
    where: {
      nutrientDefinition: {
        code: { in: ['ENERGY_KCAL', 'PROTEIN', 'CARBOHYDRATE', 'FAT'] },
      },
    },
    include: { nutrientDefinition: true },
  },
} satisfies Prisma.FoodInclude;

const detailInclude = {
  category: true,
  nutrients: {
    include: { nutrientDefinition: true },
    orderBy: { nutrientDefinition: { displayOrder: 'asc' } },
  },
  servings: { orderBy: { name: 'asc' } },
  aliases: { orderBy: { alias: 'asc' } },
} satisfies Prisma.FoodInclude;

type SummaryRecord = Prisma.FoodGetPayload<{ include: typeof summaryInclude }>;
type DetailRecord = Prisma.FoodGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class PrismaFoodCatalogReadRepository implements FoodCatalogReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: SearchFoodsCriteria) {
    const where: Prisma.FoodWhereInput = {
      isActive: true,
      deletedAt: null,
      OR: [
        { isGlobal: true, householdId: null },
        {
          household: {
            memberships: {
              some: {
                userId: criteria.actorId,
                status: HouseholdMembershipStatus.ACTIVE,
              },
            },
          },
        },
      ],
      categoryId: criteria.categoryId,
      preparationState: criteria.preparationState,
      foodType: criteria.foodType,
      ...(criteria.query
        ? {
            AND: {
              OR: [
                { name: { contains: criteria.query, mode: 'insensitive' } },
                { brand: { contains: criteria.query, mode: 'insensitive' } },
                {
                  aliases: {
                    some: { alias: { contains: criteria.query, mode: 'insensitive' } },
                  },
                },
              ],
            },
          }
        : {}),
    };
    const [foods, total] = await Promise.all([
      this.prisma.food.findMany({
        where,
        include: summaryInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.food.count({ where }),
    ]);

    return {
      items: foods.map(toSummary),
      page: criteria.page,
      limit: criteria.limit,
      total,
    };
  }

  async findVisibleById(actorId: string, foodId: string): Promise<FoodDetailView | null> {
    const food = await this.prisma.food.findFirst({
      where: {
        id: foodId,
        isActive: true,
        deletedAt: null,
        OR: [
          { isGlobal: true, householdId: null },
          {
            household: {
              memberships: {
                some: { userId: actorId, status: HouseholdMembershipStatus.ACTIVE },
              },
            },
          },
        ],
      },
      include: detailInclude,
    });

    return food ? toDetail(food) : null;
  }

  async listCategories(): Promise<CategoryView[]> {
    return this.prisma.foodCategory.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async listNutrients(): Promise<NutrientDefinitionView[]> {
    return this.prisma.nutrientDefinition.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }
}

function toSummary(food: SummaryRecord): FoodSummaryView {
  const nutrients = new Map(
    food.nutrients.map(({ nutrientDefinition, amount }) => [
      nutrientDefinition.code,
      amount.toNumber(),
    ]),
  );
  return {
    id: food.id,
    householdId: food.householdId,
    name: food.name,
    brand: food.brand,
    category: food.category,
    foodType: food.foodType,
    preparationState: food.preparationState,
    referenceQuantity: food.referenceQuantity.toNumber(),
    referenceUnit: food.referenceUnit,
    energyKcal: nutrients.get('ENERGY_KCAL') ?? null,
    proteinGrams: nutrients.get('PROTEIN') ?? null,
    carbohydrateGrams: nutrients.get('CARBOHYDRATE') ?? null,
    fatGrams: nutrients.get('FAT') ?? null,
  };
}

function toDetail(food: DetailRecord): FoodDetailView {
  return {
    ...toSummary(food),
    description: food.description,
    source: food.source,
    sourceReference: food.sourceReference,
    confidenceLevel: food.confidenceLevel,
    isGlobal: food.isGlobal,
    nutrients: food.nutrients.map(({ id, nutrientDefinition, amount }): FoodNutrientView => ({
      id,
      nutrientDefinition,
      amount: amount.toNumber(),
    })),
    servings: food.servings.map((serving) => ({
      id: serving.id,
      name: serving.name,
      quantity: serving.quantity.toNumber(),
      unit: serving.unit,
      equivalentGrams: serving.equivalentGrams?.toNumber() ?? null,
      equivalentMilliliters: serving.equivalentMilliliters?.toNumber() ?? null,
    })),
    aliases: food.aliases.map(({ alias }) => alias),
  };
}
