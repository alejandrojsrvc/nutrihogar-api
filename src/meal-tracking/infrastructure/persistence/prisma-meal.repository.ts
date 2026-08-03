import { HouseholdMembershipStatus, MealStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  MealListCriteria,
  MealListResult,
  MealRepository,
  MealUnitOfWork,
  CreateMealInput,
  ReplaceMealInput,
  CancelMealInput,
} from '../../application/ports/meal-repository.port';
import { MealView } from '../../domain/models/meal.models';
import { PrismaMealMapper } from './prisma-meal.mapper';

export const mealInclude = {
  items: {
    include: { nutrientSnapshots: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.MealInclude;

@Injectable()
export class PrismaMealRepository implements MealRepository, MealUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async findHouseholdAccess(actorId: string, householdId: string) {
    const membership = await this.prisma.householdMembership.findFirst({
      where: {
        userId: actorId,
        householdId,
        status: HouseholdMembershipStatus.ACTIVE,
        household: { deletedAt: null },
      },
      select: { role: true, household: { select: { timezone: true } } },
    });

    return membership ? { role: membership.role, timezone: membership.household.timezone } : null;
  }

  async hasActiveProfile(adultProfileId: string, householdId: string): Promise<boolean> {
    const profile = await this.prisma.adultProfile.findFirst({
      where: { id: adultProfileId, householdId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    return profile !== null;
  }

  async findById(mealId: string): Promise<MealView | null> {
    const meal = await this.prisma.meal.findUnique({ where: { id: mealId }, include: mealInclude });
    return meal ? PrismaMealMapper.toView(meal) : null;
  }

  async list(criteria: MealListCriteria): Promise<MealListResult> {
    const where: Prisma.MealWhereInput = {
      householdId: criteria.householdId,
      adultProfileId: criteria.adultProfileId,
      mealType: criteria.mealType,
      ...(criteria.includeCancelled ? {} : { status: MealStatus.CONFIRMED }),
      ...(criteria.dateFrom || criteria.dateTo
        ? {
            consumedAt: {
              gte: criteria.dateFrom,
              lt: criteria.dateTo,
            },
          }
        : {}),
    };
    const [meals, total] = await Promise.all([
      this.prisma.meal.findMany({
        where,
        include: mealInclude,
        orderBy: [{ consumedAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.meal.count({ where }),
    ]);

    return {
      items: meals.map((meal) => PrismaMealMapper.toView(meal)),
      page: criteria.page,
      limit: criteria.limit,
      total,
    };
  }

  async listForAnalysis(criteria: Omit<MealListCriteria, 'page' | 'limit'>): Promise<MealView[]> {
    const where: Prisma.MealWhereInput = {
      householdId: criteria.householdId,
      adultProfileId: criteria.adultProfileId,
      mealType: criteria.mealType,
      ...(criteria.includeCancelled ? {} : { status: MealStatus.CONFIRMED }),
      ...(criteria.dateFrom || criteria.dateTo
        ? { consumedAt: { gte: criteria.dateFrom, lt: criteria.dateTo } }
        : {}),
    };
    const meals = await this.prisma.meal.findMany({
      where,
      include: mealInclude,
      orderBy: [{ consumedAt: 'asc' }, { id: 'asc' }],
    });
    return meals.map((meal) => PrismaMealMapper.toView(meal));
  }

  async create(input: CreateMealInput): Promise<MealView> {
    const meal = await this.prisma.$transaction(async (transaction) =>
      transaction.meal.create({
        data: {
          householdId: input.householdId,
          adultProfileId: input.adultProfileId,
          mealType: input.mealType,
          consumedAt: input.consumedAt,
          notes: input.notes,
          createdById: input.createdById,
          source: input.source as unknown as 'MANUAL' | 'DUPLICATED' | 'PREPARED_BATCH',
          items: { create: input.items.map(toItemCreateData) },
        },
        include: mealInclude,
      }),
    );

    return PrismaMealMapper.toView(meal);
  }

  async replace(input: ReplaceMealInput): Promise<MealView | null> {
    const meal = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.meal.findFirst({
        where: { id: input.mealId, status: MealStatus.CONFIRMED },
        select: { id: true },
      });
      if (!current) return null;

      return transaction.meal.update({
        where: { id: input.mealId },
        data: {
          mealType: input.mealType,
          consumedAt: input.consumedAt,
          notes: input.notes,
          items: {
            deleteMany: {},
            create: input.items.map(toItemCreateData),
          },
        },
        include: mealInclude,
      });
    });

    return meal ? PrismaMealMapper.toView(meal) : null;
  }

  async cancel(input: CancelMealInput): Promise<boolean> {
    const result = await this.prisma.meal.updateMany({
      where: { id: input.mealId, status: MealStatus.CONFIRMED },
      data: { status: MealStatus.CANCELLED, deletedAt: input.deletedAt },
    });

    return result.count > 0;
  }
}

function toItemCreateData(item: CreateMealInput['items'][number]) {
  return {
    foodId: item.foodId,
    foodServingId: item.foodServingId,
    nameSnapshot: item.nameSnapshot,
    brandSnapshot: item.brandSnapshot,
    preparationStateSnapshot: item.preparationStateSnapshot,
    quantity: item.quantity.toString(),
    unit: item.unit,
    baseQuantity: item.baseQuantity.toString(),
    baseUnit: item.baseUnit,
    measurementMethod: item.measurementMethod,
    confidenceLevel: item.confidenceLevel,
    nutrientSnapshots: {
      create: item.nutrients.map((nutrient) => ({
        nutrientCode: nutrient.code,
        nutrientName: nutrient.name,
        unit: nutrient.unit,
        amount: nutrient.amount.toString(),
      })),
    },
  };
}
