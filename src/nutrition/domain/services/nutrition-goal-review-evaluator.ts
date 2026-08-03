import Decimal from 'decimal.js';

/** Outcomes returned by the goal review evaluator. */
export enum NutritionGoalReviewOutcome {
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  KEEP_CURRENT_GOAL = 'KEEP_CURRENT_GOAL',
  REVIEW_RECOMMENDED = 'REVIEW_RECOMMENDED',
  REVIEW_DUE_TO_PROFILE_CHANGE = 'REVIEW_DUE_TO_PROFILE_CHANGE',
  REVIEW_POSTPONED = 'REVIEW_POSTPONED',
}

/** Reasons are deliberately structured so callers do not need to parse text. */
export enum NutritionGoalReviewReason {
  GOAL_AGE_THRESHOLD = 'GOAL_AGE_THRESHOLD',
  WEIGHT_TREND_FASTER_THAN_EXPECTED = 'WEIGHT_TREND_FASTER_THAN_EXPECTED',
  WEIGHT_TREND_SLOWER_THAN_EXPECTED = 'WEIGHT_TREND_SLOWER_THAN_EXPECTED',
  NO_MEANINGFUL_CHANGE = 'NO_MEANINGFUL_CHANGE',
  LOW_ADHERENCE = 'LOW_ADHERENCE',
  INSUFFICIENT_TRACKING = 'INSUFFICIENT_TRACKING',
  ACTIVITY_LEVEL_CHANGED = 'ACTIVITY_LEVEL_CHANGED',
  PROFILE_DATA_CHANGED = 'PROFILE_DATA_CHANGED',
  GOAL_EXPIRED = 'GOAL_EXPIRED',
}

export interface NutritionGoalWeightRecord {
  recordedAt: Date;
  weightKg: Decimal.Value;
}

export interface NutritionGoalMeasurementRecord {
  recordedAt: Date;
  values: Record<string, Decimal.Value>;
}

export interface NutritionGoalReviewGoal {
  startedAt: Date;
  expiresAt?: Date | null;
  /** Signed kilograms expected to change per week. Use zero for maintenance. */
  expectedWeeklyWeightChangeKg: Decimal.Value;
}

export interface NutritionGoalReviewInput {
  evaluationDate: Date;
  activeGoal: NutritionGoalReviewGoal;
  initialWeight: NutritionGoalWeightRecord;
  recentWeights: readonly NutritionGoalWeightRecord[];
  recentMeasurements?: readonly NutritionGoalMeasurementRecord[];
  calorieAdherence: Decimal.Value;
  proteinAdherence: Decimal.Value;
  trackingDays: number;
  activityLevelChanged: boolean;
  profileDataChanged: boolean;
  priorReview?: {
    reviewedAt: Date;
    postponedUntil?: Date | null;
  };
}

export interface NutritionGoalReviewResult {
  outcome: NutritionGoalReviewOutcome;
  reasons: readonly NutritionGoalReviewReason[];
  /** Available when at least two dated weight records can establish a trend. */
  actualWeeklyWeightChangeKg: Decimal | null;
}

/**
 * Defaults are intentionally conservative: four weeks and three weight records
 * avoid reacting to noise, 80% adherence avoids changing calories on unreliable
 * data, and 0.10 kg/week is the smallest meaningful trend difference. A goal is
 * also reviewed after 12 weeks even when its trend is within expectations.
 */
export const DEFAULT_NUTRITION_GOAL_REVIEW_THRESHOLDS = {
  minimumWeeksWithData: 4,
  minimumWeightRecords: 3,
  minimumTrackingDays: 14,
  minimumAdherence: new Decimal('0.8'),
  meaningfulWeeklyWeightChangeKg: new Decimal('0.1'),
  goalAgeWeeks: 12,
} as const;

export interface NutritionGoalReviewThresholds {
  minimumWeeksWithData: number;
  minimumWeightRecords: number;
  minimumTrackingDays: number;
  minimumAdherence: Decimal.Value;
  meaningfulWeeklyWeightChangeKg: Decimal.Value;
  goalAgeWeeks: number;
}

export class NutritionGoalReviewEvaluator {
  constructor(
    private readonly thresholds: NutritionGoalReviewThresholds = DEFAULT_NUTRITION_GOAL_REVIEW_THRESHOLDS,
  ) {}

  evaluate(input: NutritionGoalReviewInput): NutritionGoalReviewResult {
    const postponeUntil = input.priorReview?.postponedUntil;
    if (postponeUntil && input.evaluationDate < postponeUntil) {
      return this.result(NutritionGoalReviewOutcome.REVIEW_POSTPONED, []);
    }

    const profileReasons = [
      ...(input.activityLevelChanged ? [NutritionGoalReviewReason.ACTIVITY_LEVEL_CHANGED] : []),
      ...(input.profileDataChanged ? [NutritionGoalReviewReason.PROFILE_DATA_CHANGED] : []),
    ];
    const goalExpired =
      input.activeGoal.expiresAt !== null &&
      input.activeGoal.expiresAt !== undefined &&
      input.evaluationDate >= input.activeGoal.expiresAt;

    if (profileReasons.length > 0) {
      return this.result(NutritionGoalReviewOutcome.REVIEW_DUE_TO_PROFILE_CHANGE, profileReasons);
    }

    const sortedWeights = [input.initialWeight, ...input.recentWeights].sort(
      (left, right) => left.recordedAt.getTime() - right.recordedAt.getTime(),
    );
    const uniqueWeights = sortedWeights.filter(
      (weight, index) =>
        index === 0 ||
        weight.recordedAt.getTime() !== sortedWeights[index - 1].recordedAt.getTime(),
    );
    const latestWeight = uniqueWeights[uniqueWeights.length - 1];
    const weeksWithData = latestWeight
      ? weeksBetween(uniqueWeights[0].recordedAt, latestWeight.recordedAt)
      : 0;
    const hasEnoughData =
      uniqueWeights.length >= this.thresholds.minimumWeightRecords &&
      weeksWithData >= this.thresholds.minimumWeeksWithData;

    if (!hasEnoughData) {
      if (goalExpired) {
        return this.result(NutritionGoalReviewOutcome.REVIEW_RECOMMENDED, [
          NutritionGoalReviewReason.GOAL_EXPIRED,
        ]);
      }
      return this.result(NutritionGoalReviewOutcome.INSUFFICIENT_DATA, [
        NutritionGoalReviewReason.INSUFFICIENT_TRACKING,
      ]);
    }
    if (input.trackingDays < this.thresholds.minimumTrackingDays) {
      if (goalExpired) {
        return this.result(NutritionGoalReviewOutcome.REVIEW_RECOMMENDED, [
          NutritionGoalReviewReason.GOAL_EXPIRED,
        ]);
      }
      return this.result(NutritionGoalReviewOutcome.INSUFFICIENT_DATA, [
        NutritionGoalReviewReason.INSUFFICIENT_TRACKING,
      ]);
    }

    const minimumAdherence = new Decimal(this.thresholds.minimumAdherence);
    if (
      new Decimal(input.calorieAdherence).lt(minimumAdherence) ||
      new Decimal(input.proteinAdherence).lt(minimumAdherence)
    ) {
      return this.result(NutritionGoalReviewOutcome.KEEP_CURRENT_GOAL, [
        NutritionGoalReviewReason.LOW_ADHERENCE,
      ]);
    }

    const actualWeeklyChange = weeklyChange(uniqueWeights);
    const expected = new Decimal(input.activeGoal.expectedWeeklyWeightChangeKg);
    const difference = actualWeeklyChange.minus(expected);
    const tolerance = new Decimal(this.thresholds.meaningfulWeeklyWeightChangeKg);
    let reason: NutritionGoalReviewReason;
    if (difference.lt(tolerance.neg())) {
      reason = NutritionGoalReviewReason.WEIGHT_TREND_FASTER_THAN_EXPECTED;
    } else if (difference.gt(tolerance)) {
      reason = NutritionGoalReviewReason.WEIGHT_TREND_SLOWER_THAN_EXPECTED;
    } else {
      reason = NutritionGoalReviewReason.NO_MEANINGFUL_CHANGE;
    }
    const goalAgeWeeks = weeksBetween(input.activeGoal.startedAt, input.evaluationDate);
    const reasons = [
      ...(goalExpired ? [NutritionGoalReviewReason.GOAL_EXPIRED] : []),
      ...(goalAgeWeeks >= this.thresholds.goalAgeWeeks
        ? [NutritionGoalReviewReason.GOAL_AGE_THRESHOLD]
        : []),
      reason,
    ];

    return this.result(NutritionGoalReviewOutcome.REVIEW_RECOMMENDED, reasons, actualWeeklyChange);
  }

  private result(
    outcome: NutritionGoalReviewOutcome,
    reasons: NutritionGoalReviewReason[],
    actualWeeklyWeightChangeKg: Decimal | null = null,
  ): NutritionGoalReviewResult {
    return { outcome, reasons, actualWeeklyWeightChangeKg };
  }
}

function weeksBetween(start: Date, end: Date): number {
  return new Decimal(end.getTime() - start.getTime()).dividedBy(7 * 24 * 60 * 60 * 1000).toNumber();
}

function weeklyChange(weights: readonly NutritionGoalWeightRecord[]): Decimal {
  const first = weights[0];
  const last = weights[weights.length - 1];
  const weeks = new Decimal(last.recordedAt.getTime() - first.recordedAt.getTime()).dividedBy(
    7 * 24 * 60 * 60 * 1000,
  );
  return new Decimal(last.weightKg).minus(first.weightKg).dividedBy(weeks);
}
