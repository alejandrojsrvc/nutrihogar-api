import { HouseholdMembershipStatus, MealStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { NutritionReportRepository } from '../../application/ports/nutrition-report-repository.port';
import { PrismaMealMapper } from '../../../meal-tracking/infrastructure/persistence/prisma-meal.mapper';
import { PrismaNutritionGoalMapper } from '../../../nutrition/infrastructure/persistence/prisma-nutrition-goal.mapper';
import { PrismaWeeklyPlanMapper } from '../../../meal-planning/infrastructure/persistence/prisma-weekly-plan.mapper';
import type {
  OperationalReportRepository,
  ReportPeriod,
} from '../../application/ports/operational-report-repository.port';
import type { DigestiveSymptomDelegate } from '../../../health-tracking/infrastructure/persistence/prisma-digestive-symptom.types';

const mealInclude = {
  items: {
    include: { nutrientSnapshots: true },
    orderBy: { createdAt: 'asc' },
  },
  plannedMeals: { select: { id: true } },
} satisfies Prisma.MealInclude;

const planInclude = {
  meals: {
    orderBy: [{ date: 'asc' }, { position: 'asc' }, { id: 'asc' }],
    include: { participants: { orderBy: { id: 'asc' } } },
  },
};

@Injectable()
export class PrismaNutritionReportRepository
  implements NutritionReportRepository, OperationalReportRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findAccessibleProfile(actorId: string, profileId: string) {
    const profile = await this.prisma.adultProfile.findFirst({
      where: {
        id: profileId,
        isActive: true,
        deletedAt: null,
        household: {
          deletedAt: null,
          memberships: { some: { userId: actorId, status: HouseholdMembershipStatus.ACTIVE } },
        },
      },
      select: {
        id: true,
        name: true,
        householdId: true,
        household: { select: { timezone: true } },
      },
    });
    return profile
      ? {
          id: profile.id,
          name: profile.name,
          householdId: profile.householdId,
          timezone: profile.household.timezone,
        }
      : null;
  }

  async listMeals(profileId: string, dateFrom: Date, dateTo: Date) {
    const meals = await this.prisma.meal.findMany({
      where: {
        adultProfileId: profileId,
        status: MealStatus.CONFIRMED,
        consumedAt: { gte: dateFrom, lt: dateTo },
      },
      include: mealInclude,
      orderBy: [{ consumedAt: 'asc' }, { id: 'asc' }],
    });
    return meals.map((meal) => PrismaMealMapper.toView(meal));
  }

  async listGoals(profileId: string) {
    const goals = await this.prisma.nutritionGoal.findMany({
      where: { adultProfileId: profileId },
      orderBy: [{ validFrom: 'asc' }, { id: 'asc' }],
    });
    return goals.map((goal) => PrismaNutritionGoalMapper.goalToView(goal));
  }

  async findPlan(householdId: string, weekStart: Date) {
    const plan = await this.prisma.weeklyPlan.findFirst({
      where: { householdId, weekStart },
      include: planInclude,
    });
    return plan ? PrismaWeeklyPlanMapper.toDomain(plan) : null;
  }

  async listBodyWeights(profileId: string, dateFrom: Date, dateTo: Date) {
    const entries = await this.prisma.bodyWeightEntry.findMany({
      where: { adultProfileId: profileId, recordedAt: { gte: dateFrom, lt: dateTo } },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });
    return entries.map((entry) => ({
      value: Number(entry.value),
      unit: entry.unit,
      recordedAt: entry.recordedAt,
    }));
  }

  countSymptoms(profileId: string, dateFrom: Date, dateTo: Date) {
    const client = this.prisma as unknown as { digestiveSymptomEntry: DigestiveSymptomDelegate };
    return client.digestiveSymptomEntry.count({
      where: { adultProfileId: profileId, startAt: { gte: dateFrom, lt: dateTo } },
    });
  }

  async listInventoryItems(householdId: string, period: ReportPeriod) {
    const records = await this.prisma.inventoryItem.findMany({
      where: { householdId },
      include: {
        movements: {
          where: { occurredAt: { gte: period.from, lt: period.to } },
          orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ nameSnapshot: 'asc' }, { id: 'asc' }],
    });
    return records.map((item) => ({
      id: item.id,
      foodId: item.foodId,
      name: item.nameSnapshot,
      itemType: item.itemType,
      currentQuantity: item.currentQuantity.toString(),
      unit: item.unit,
      minimumQuantity: item.minimumQuantity?.toString() ?? null,
      expiresAt: item.expiresAt,
      status: item.status,
      movements: item.movements.map((movement) => ({
        itemId: movement.itemId,
        foodId: item.foodId,
        type: movement.type,
        quantity: movement.quantity.toString(),
        unit: movement.unit,
        occurredAt: movement.occurredAt,
        reason: movement.reason,
      })),
    }));
  }

  async listPurchases(householdId: string, period: ReportPeriod) {
    const records = await this.prisma.purchase.findMany({
      where: { householdId, purchaseDate: { gte: period.from, lt: period.to } },
      include: { items: { orderBy: { id: 'asc' } } },
      orderBy: [{ purchaseDate: 'asc' }, { id: 'asc' }],
    });
    return records.map((purchase) => ({
      id: purchase.id,
      storeName: purchase.storeName,
      purchaseDate: purchase.purchaseDate,
      status: purchase.status,
      currency: purchase.currency,
      total: purchase.total.toString(),
      items: purchase.items.map((item) => ({
        foodId: item.foodId,
        name: item.nameSnapshot,
        unit: item.unit,
        quantity: item.quantity.toString(),
      })),
    }));
  }

  async listPreparedLeftovers(householdId: string, period: ReportPeriod) {
    const records = await this.prisma.preparedFoodLeftover.findMany({
      where: { householdId, updatedAt: { gte: period.from, lt: period.to } },
      include: { preparedBatch: { select: { recipeNameSnapshot: true } } },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((leftover) => ({
      name: leftover.preparedBatch.recipeNameSnapshot,
      weight: leftover.availableWeight.toString(),
      status: leftover.status,
      storedAt: leftover.storedAt,
      updatedAt: leftover.updatedAt,
    }));
  }
}
