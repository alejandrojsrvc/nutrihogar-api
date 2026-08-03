import { Injectable } from '@nestjs/common';
import { NutritionGoalReviewTerminalAction, NutritionGoalSuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateNutritionGoalSuggestionInput,
  ConfirmNutritionGoalSuggestionInput,
  RejectNutritionGoalSuggestionInput,
  NutritionGoalUnitOfWork,
} from '../../application/ports/nutrition-goal-repository.port';
import {
  CreateNutritionGoalReviewInput,
  NutritionGoalReviewUnitOfWork,
} from '../../application/ports/nutrition-goal-review-repository.port';
import { NutritionGoalReviewView } from '../../domain/models/nutrition-goal-review.models';
import {
  NutritionGoalReviewOutcome,
  NutritionGoalReviewReason,
} from '../../domain/services/nutrition-goal-review-evaluator';
import {
  NutritionGoalSuggestionView,
  NutritionGoalView,
} from '../../domain/models/nutrition-goal.models';
import { PrismaNutritionGoalMapper } from './prisma-nutrition-goal.mapper';

@Injectable()
export class PrismaNutritionGoalUnitOfWork
  implements NutritionGoalUnitOfWork, NutritionGoalReviewUnitOfWork
{
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

  async rejectSuggestion(input: RejectNutritionGoalSuggestionInput): Promise<boolean> {
    const result = await this.prisma.nutritionGoalSuggestion.updateMany({
      where: {
        id: input.suggestionId,
        status: NutritionGoalSuggestionStatus.PENDING,
        expiresAt: { gt: input.rejectedAt },
      },
      data: { status: NutritionGoalSuggestionStatus.REJECTED },
    });

    return result.count > 0;
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

  async createReview(input: CreateNutritionGoalReviewInput): Promise<NutritionGoalReviewView> {
    const review = await this.prisma.nutritionGoalReview.create({
      data: {
        adultProfileId: input.adultProfileId,
        outcome: input.outcome,
        reasons: [...input.reasons],
        evaluatedAt: input.evaluatedAt,
        postponedUntil: input.postponedUntil,
      },
    });
    return reviewToView(review);
  }

  async attachProposal(reviewId: string, suggestionId: string): Promise<NutritionGoalReviewView> {
    return reviewToView(
      await this.prisma.nutritionGoalReview.update({
        where: { id: reviewId },
        data: { proposalSuggestionId: suggestionId },
      }),
    );
  }

  async rejectReview(
    reviewId: string,
    actorId: string,
    actedAt: Date,
  ): Promise<NutritionGoalReviewView | null> {
    const result = await this.prisma.nutritionGoalReview.updateMany({
      where: { id: reviewId, terminalAction: null },
      data: {
        terminalAction: NutritionGoalReviewTerminalAction.REJECTED,
        actedById: actorId,
        actedAt,
      },
    });
    if (!result.count) return null;
    return reviewToView(
      await this.prisma.nutritionGoalReview.findUniqueOrThrow({ where: { id: reviewId } }),
    );
  }

  async postponeReview(
    reviewId: string,
    actorId: string,
    postponedUntil: Date,
    actedAt: Date,
  ): Promise<NutritionGoalReviewView | null> {
    const result = await this.prisma.nutritionGoalReview.updateMany({
      where: { id: reviewId, terminalAction: null },
      data: {
        terminalAction: NutritionGoalReviewTerminalAction.POSTPONED,
        postponedUntil,
        actedById: actorId,
        actedAt,
      },
    });
    if (!result.count) return null;
    return reviewToView(
      await this.prisma.nutritionGoalReview.findUniqueOrThrow({ where: { id: reviewId } }),
    );
  }

  async acceptReview(input: {
    reviewId: string;
    suggestionId: string;
    actorId: string;
    actedAt: Date;
  }): Promise<NutritionGoalView | null> {
    const goal = await this.prisma.$transaction(async (transaction) => {
      const review = await transaction.nutritionGoalReview.updateMany({
        where: {
          id: input.reviewId,
          proposalSuggestionId: input.suggestionId,
          terminalAction: null,
        },
        data: {
          terminalAction: NutritionGoalReviewTerminalAction.ACCEPTED,
          actedById: input.actorId,
          actedAt: input.actedAt,
        },
      });
      if (!review.count) return null;
      const claimed = await transaction.nutritionGoalSuggestion.updateMany({
        where: {
          id: input.suggestionId,
          status: NutritionGoalSuggestionStatus.PENDING,
          expiresAt: { gt: input.actedAt },
        },
        data: { status: NutritionGoalSuggestionStatus.CONFIRMED },
      });
      if (!claimed.count) return null;
      const suggestion = await transaction.nutritionGoalSuggestion.findUniqueOrThrow({
        where: { id: input.suggestionId },
      });
      await transaction.nutritionGoal.updateMany({
        where: { adultProfileId: suggestion.adultProfileId, validUntil: null },
        data: { validUntil: input.actedAt },
      });
      return transaction.nutritionGoal.create({
        data: {
          adultProfileId: suggestion.adultProfileId,
          validFrom: input.actedAt,
          dailyCalories: suggestion.suggestedCalories,
          proteinGrams: suggestion.suggestedProteinGrams,
          carbohydrateGrams: suggestion.suggestedCarbohydrateGrams,
          fatGrams: suggestion.suggestedFatGrams,
          fiberGrams: suggestion.suggestedFiberGrams,
          goalType: goalType(suggestion.calculationInput),
          calculationMethod: suggestion.calculationMethod,
          calculationInput: PrismaNutritionGoalMapper.snapshotToPrisma(suggestion.calculationInput),
          confirmedById: input.actorId,
        },
      });
    });
    return goal ? PrismaNutritionGoalMapper.goalToView(goal) : null;
  }
}

function reviewToView(record: {
  id: string;
  adultProfileId: string;
  outcome: string;
  reasons: unknown;
  evaluatedAt: Date;
  postponedUntil: Date | null;
  proposalSuggestionId: string | null;
  terminalAction: NutritionGoalReviewTerminalAction | null;
  actedById: string | null;
  actedAt: Date | null;
}): NutritionGoalReviewView {
  return {
    id: record.id,
    adultProfileId: record.adultProfileId,
    outcome: record.outcome as NutritionGoalReviewOutcome,
    reasons: Array.isArray(record.reasons) ? (record.reasons as NutritionGoalReviewReason[]) : [],
    evaluatedAt: record.evaluatedAt,
    postponedUntil: record.postponedUntil,
    proposalSuggestionId: record.proposalSuggestionId,
    terminalAction: record.terminalAction,
    actedById: record.actedById,
    actedAt: record.actedAt,
  };
}

function goalType(input: unknown): string {
  const primaryGoal =
    typeof input === 'object' && input !== null && 'primaryGoal' in input
      ? input.primaryGoal
      : null;
  return typeof primaryGoal === 'string' ? primaryGoal : 'MAINTENANCE';
}
