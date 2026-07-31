import { HouseholdMembershipStatus, MealStatus, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  DailyNutritionSummaryRepository,
  DailyNutritionSummaryData,
} from '../../application/ports/daily-nutrition-summary-repository.port';
import { PrismaMealMapper } from './prisma-meal.mapper';
import { PrismaNutritionGoalMapper } from '../../../nutrition/infrastructure/persistence/prisma-nutrition-goal.mapper';

const mealInclude = {
  items: {
    include: { nutrientSnapshots: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.MealInclude;

@Injectable()
export class PrismaDailyNutritionSummaryRepository implements DailyNutritionSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAccessibleProfile(actorId: string, profileId: string) {
    const profile = await this.prisma.adultProfile.findFirst({
      where: {
        id: profileId,
        isActive: true,
        deletedAt: null,
        household: {
          deletedAt: null,
          memberships: {
            some: { userId: actorId, status: HouseholdMembershipStatus.ACTIVE },
          },
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

  async findByProfileAndRange(
    profileId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<DailyNutritionSummaryData> {
    const [meals, goal] = await Promise.all([
      this.prisma.meal.findMany({
        where: {
          adultProfileId: profileId,
          status: MealStatus.CONFIRMED,
          consumedAt: { gte: dateFrom, lt: dateTo },
        },
        include: mealInclude,
        orderBy: [{ consumedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.nutritionGoal.findFirst({
        where: {
          adultProfileId: profileId,
          validFrom: { lt: dateTo },
          OR: [{ validUntil: null }, { validUntil: { gt: dateFrom } }],
        },
        orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return {
      meals: meals.map((meal) => PrismaMealMapper.toView(meal)),
      goal: goal ? PrismaNutritionGoalMapper.goalToView(goal) : null,
    };
  }
}
