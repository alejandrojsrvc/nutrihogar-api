import { Injectable } from '@nestjs/common';
import { NutritionGoalSuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateNutritionGoalSuggestionInput,
  ConfirmNutritionGoalSuggestionInput,
  NutritionGoalUnitOfWork,
} from '../../application/ports/nutrition-goal-repository.port';
import {
  NutritionGoalSuggestionView,
  NutritionGoalView,
} from '../../domain/models/nutrition-goal.models';
import { PrismaNutritionGoalMapper } from './prisma-nutrition-goal.mapper';

@Injectable()
export class PrismaNutritionGoalUnitOfWork implements NutritionGoalUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async createSuggestion(
    input: CreateNutritionGoalSuggestionInput,
  ): Promise<NutritionGoalSuggestionView> {
    const suggestion = await this.prisma.nutritionGoalSuggestion.create({
      data: {
        adultProfileId: input.adultProfileId,
        calculationMethod: input.calculationMethod,
        calculationInput: PrismaNutritionGoalMapper.snapshotToPrisma(input.calculationInput),
        bmr: input.bmr.toString(),
        tdee: input.tdee.toString(),
        suggestedCalories: input.values.calories.toString(),
        suggestedProteinGrams: input.values.proteinGrams.toString(),
        suggestedCarbohydrateGrams: input.values.carbohydrateGrams.toString(),
        suggestedFatGrams: input.values.fatGrams.toString(),
        suggestedFiberGrams: input.values.fiberGrams.toString(),
        status: NutritionGoalSuggestionStatus.PENDING,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      },
    });

    return PrismaNutritionGoalMapper.suggestionToView(suggestion);
  }

  async confirmSuggestion(
    input: ConfirmNutritionGoalSuggestionInput,
  ): Promise<NutritionGoalView | null> {
    const goal = await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.nutritionGoalSuggestion.updateMany({
        where: {
          id: input.suggestionId,
          status: NutritionGoalSuggestionStatus.PENDING,
          expiresAt: { gt: input.confirmedAt },
        },
        data: { status: NutritionGoalSuggestionStatus.CONFIRMED },
      });
      if (claimed.count === 0) return null;

      await transaction.nutritionGoal.updateMany({
        where: { adultProfileId: input.adultProfileId, validUntil: null },
        data: { validUntil: input.confirmedAt },
      });

      return transaction.nutritionGoal.create({
        data: {
          adultProfileId: input.adultProfileId,
          validFrom: input.confirmedAt,
          dailyCalories: input.values.calories.toString(),
          proteinGrams: input.values.proteinGrams.toString(),
          carbohydrateGrams: input.values.carbohydrateGrams.toString(),
          fatGrams: input.values.fatGrams.toString(),
          fiberGrams: input.values.fiberGrams.toString(),
          goalType: input.goalType,
          calculationMethod: input.calculationMethod,
          calculationInput: PrismaNutritionGoalMapper.snapshotToPrisma(input.calculationInput),
          confirmedById: input.confirmedById,
        },
      });
    });

    return goal ? PrismaNutritionGoalMapper.goalToView(goal) : null;
  }

  async expireSuggestion(suggestionId: string): Promise<void> {
    await this.prisma.nutritionGoalSuggestion.updateMany({
      where: {
        id: suggestionId,
        status: NutritionGoalSuggestionStatus.PENDING,
      },
      data: { status: NutritionGoalSuggestionStatus.EXPIRED },
    });
  }
}
