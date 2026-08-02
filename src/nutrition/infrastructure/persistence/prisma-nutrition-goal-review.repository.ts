import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  NutritionGoalReviewData,
  NutritionGoalReviewView,
} from '../../domain/models/nutrition-goal-review.models';
import { NutritionGoalReviewRepository } from '../../application/ports/nutrition-goal-review-repository.port';
import {
  NutritionGoalReviewOutcome,
  NutritionGoalReviewReason,
} from '../../domain/services/nutrition-goal-review-evaluator';
import Decimal from 'decimal.js';
import { NutritionGoalReviewTerminalAction } from '@prisma/client';

@Injectable()
export class PrismaNutritionGoalReviewRepository implements NutritionGoalReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLatest(profileId: string): Promise<NutritionGoalReviewView | null> {
    const record = await this.prisma.nutritionGoalReview.findFirst({
      where: { adultProfileId: profileId },
      orderBy: [{ evaluatedAt: 'desc' }, { id: 'desc' }],
    });
    return record ? toView(record) : null;
  }

  async collectData(profileId: string, from: Date, to: Date): Promise<NutritionGoalReviewData> {
    const [profile, weights, measurements, goal, meals] = await Promise.all([
      this.prisma.adultProfile.findUniqueOrThrow({
        where: { id: profileId },
        select: { weightKg: true, heightCm: true, activityLevel: true, primaryGoal: true },
      }),
      this.prisma.bodyWeightEntry.findMany({
        where: { adultProfileId: profileId, recordedAt: { gte: from, lte: to } },
        orderBy: { recordedAt: 'asc' },
      }),
      this.prisma.bodyMeasurementEntry.findMany({
        where: { adultProfileId: profileId, recordedAt: { gte: from, lte: to } },
        orderBy: { recordedAt: 'asc' },
      }),
      this.prisma.nutritionGoal.findFirst({
        where: { adultProfileId: profileId, validUntil: null },
      }),
      this.prisma.meal.findMany({
        where: {
          adultProfileId: profileId,
          consumedAt: { gte: from, lte: to },
          status: 'CONFIRMED',
        },
        include: { items: { include: { nutrientSnapshots: true } } },
      }),
    ]);
    const convertedWeights = weights.map((entry) => ({
      recordedAt: entry.recordedAt,
      weightKg: new Decimal(entry.value.toString()).times(entry.unit === 'LB' ? '0.45359237' : 1),
    }));
    const initialWeight = convertedWeights[0] ?? {
      recordedAt: from,
      weightKg: profile.weightKg?.toString() ?? '0',
    };
    const targetCalories = new Decimal(goal?.dailyCalories.toString() ?? 1);
    const targetProtein = new Decimal(goal?.proteinGrams.toString() ?? 1);
    const days = new Set<string>();
    let calories = new Decimal(0);
    let protein = new Decimal(0);
    for (const meal of meals) {
      days.add(meal.consumedAt.toISOString().slice(0, 10));
      for (const item of meal.items)
        for (const nutrient of item.nutrientSnapshots) {
          if (
            nutrient.nutrientCode.toLowerCase() === 'calories' ||
            nutrient.nutrientCode.toLowerCase() === 'energy'
          )
            calories = calories.plus(nutrient.amount.toString());
          if (nutrient.nutrientCode.toLowerCase() === 'protein')
            protein = protein.plus(nutrient.amount.toString());
        }
    }
    const trackingDays = days.size;
    const divisor = new Decimal(Math.max(trackingDays, 1));
    const snapshot = goal?.calculationInput;
    const snapshotValue = (key: string) =>
      snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && key in snapshot
        ? snapshot[key]
        : undefined;
    const snapshotText = (key: string) => {
      const value = snapshotValue(key);
      return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
    };
    const activityLevel = snapshotValue('activityLevel');
    const activityLevelChanged =
      (typeof activityLevel === 'string' || typeof activityLevel === 'number') &&
      String(activityLevel) !== profile.activityLevel;
    const profileDataChanged =
      ['heightCm', 'primaryGoal'].some((key) => {
        const value = snapshotText(key);
        return (
          value !== null &&
          value !== String(key === 'heightCm' ? profile.heightCm : profile.primaryGoal)
        );
      }) ||
      (() => {
        const weight = snapshotValue('weightKg');
        return (
          (typeof weight === 'string' || typeof weight === 'number') &&
          new Decimal(weight)
            .minus(profile.weightKg?.toString() ?? 0)
            .abs()
            .gte('0.5')
        );
      })();
    return {
      initialWeight,
      recentWeights: convertedWeights.slice(1),
      recentMeasurements: measurements.map((entry) => ({
        recordedAt: entry.recordedAt,
        values: {
          [entry.type]: new Decimal(entry.value.toString()).times(entry.unit === 'IN' ? '2.54' : 1),
        },
      })),
      calorieAdherence: Decimal.min(calories.div(targetCalories.times(divisor)), 1),
      proteinAdherence: Decimal.min(protein.div(targetProtein.times(divisor)), 1),
      trackingDays,
      activityLevelChanged,
      profileDataChanged,
    };
  }
}

function toView(record: {
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
