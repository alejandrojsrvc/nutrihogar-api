import { Injectable } from '@nestjs/common';
import { HouseholdMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { NutritionGoalRepository } from '../../application/ports/nutrition-goal-repository.port';
import {
  NutritionGoalSuggestionView,
  NutritionGoalView,
} from '../../domain/models/nutrition-goal.models';
import { PrismaNutritionGoalMapper } from './prisma-nutrition-goal.mapper';

@Injectable()
export class PrismaNutritionGoalRepository implements NutritionGoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessProfile(actorId: string, adultProfileId: string): Promise<boolean> {
    const profile = await this.prisma.adultProfile.findFirst({
      where: {
        id: adultProfileId,
        isActive: true,
        deletedAt: null,
        household: {
          deletedAt: null,
          memberships: {
            some: {
              userId: actorId,
              status: HouseholdMembershipStatus.ACTIVE,
            },
          },
        },
      },
      select: { id: true },
    });

    return profile !== null;
  }

  async findSuggestionById(suggestionId: string): Promise<NutritionGoalSuggestionView | null> {
    const suggestion = await this.prisma.nutritionGoalSuggestion.findUnique({
      where: { id: suggestionId },
    });
    return suggestion ? PrismaNutritionGoalMapper.suggestionToView(suggestion) : null;
  }

  async findCurrentByProfile(adultProfileId: string): Promise<NutritionGoalView | null> {
    const goal = await this.prisma.nutritionGoal.findFirst({
      where: { adultProfileId, validUntil: null },
    });
    return goal ? PrismaNutritionGoalMapper.goalToView(goal) : null;
  }

  async listByProfile(adultProfileId: string): Promise<NutritionGoalView[]> {
    const goals = await this.prisma.nutritionGoal.findMany({
      where: { adultProfileId },
      orderBy: [{ validFrom: 'desc' }, { id: 'desc' }],
    });
    return goals.map((goal) => PrismaNutritionGoalMapper.goalToView(goal));
  }
}
