import Decimal from 'decimal.js';
import {
  NutritionGoalReviewEvaluator,
  NutritionGoalReviewOutcome,
  NutritionGoalReviewReason,
} from './nutrition-goal-review-evaluator';

const date = (day: number) => new Date(Date.UTC(2026, 0, day));
const baseInput = (overrides = {}) => ({
  evaluationDate: date(85),
  activeGoal: { startedAt: date(1), expectedWeeklyWeightChangeKg: '-0.5' },
  initialWeight: { recordedAt: date(1), weightKg: '90' },
  recentWeights: [
    { recordedAt: date(29), weightKg: '88' },
    { recordedAt: date(57), weightKg: '86' },
  ],
  calorieAdherence: '0.9',
  proteinAdherence: '0.9',
  trackingDays: 21,
  activityLevelChanged: false,
  profileDataChanged: false,
  ...overrides,
});

describe('NutritionGoalReviewEvaluator', () => {
  it('uses configurable Decimal thresholds and does not recommend from one measurement', () => {
    const evaluator = new NutritionGoalReviewEvaluator({
      minimumWeeksWithData: 2,
      minimumWeightRecords: 2,
      minimumTrackingDays: 7,
      minimumAdherence: new Decimal('0.8'),
      meaningfulWeeklyWeightChangeKg: new Decimal('0.1'),
      goalAgeWeeks: 20,
    });
    const result = evaluator.evaluate(
      baseInput({
        recentWeights: [],
        evaluationDate: date(30),
      }),
    );
    expect(result.outcome).toBe(NutritionGoalReviewOutcome.INSUFFICIENT_DATA);
    expect(result.reasons).toEqual([NutritionGoalReviewReason.INSUFFICIENT_TRACKING]);
  });

  it('returns insufficient tracking when the minimum weeks are not met', () => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({
        recentWeights: [
          { recordedAt: date(8), weightKg: '89' },
          { recordedAt: date(15), weightKg: '88' },
        ],
        trackingDays: 3,
      }),
    );
    expect(result.outcome).toBe(NutritionGoalReviewOutcome.INSUFFICIENT_DATA);
  });

  it('keeps the goal when adherence is low, before evaluating the trend', () => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({
        calorieAdherence: '0.79',
        recentWeights: [
          { recordedAt: date(29), weightKg: '80' },
          { recordedAt: date(57), weightKg: '70' },
        ],
      }),
    );
    expect(result).toMatchObject({
      outcome: NutritionGoalReviewOutcome.KEEP_CURRENT_GOAL,
      reasons: [NutritionGoalReviewReason.LOW_ADHERENCE],
    });
  });

  it.each([
    ['faster', '83.6', NutritionGoalReviewReason.WEIGHT_TREND_FASTER_THAN_EXPECTED],
    ['slower', '88.4', NutritionGoalReviewReason.WEIGHT_TREND_SLOWER_THAN_EXPECTED],
    ['unchanged', '86', NutritionGoalReviewReason.NO_MEANINGFUL_CHANGE],
  ])('classifies a %s trend deterministically', (_label, latestWeight, reason) => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({
        recentWeights: [
          { recordedAt: date(29), weightKg: '89' },
          { recordedAt: date(57), weightKg: latestWeight },
        ],
      }),
    );
    expect(result.outcome).toBe(NutritionGoalReviewOutcome.REVIEW_RECOMMENDED);
    expect(result.reasons).toContain(reason);
  });

  it('reviews profile changes even when trend data is insufficient', () => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({ recentWeights: [], activityLevelChanged: true }),
    );
    expect(result).toMatchObject({
      outcome: NutritionGoalReviewOutcome.REVIEW_DUE_TO_PROFILE_CHANGE,
      reasons: [NutritionGoalReviewReason.ACTIVITY_LEVEL_CHANGED],
    });
  });

  it('reviews declared profile data changes with their structured reason', () => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({ recentWeights: [], profileDataChanged: true }),
    );
    expect(result).toMatchObject({
      outcome: NutritionGoalReviewOutcome.REVIEW_DUE_TO_PROFILE_CHANGE,
      reasons: [NutritionGoalReviewReason.PROFILE_DATA_CHANGED],
    });
  });

  it('reviews an expired goal and records the expiration reason', () => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({
        activeGoal: {
          startedAt: date(1),
          expiresAt: date(80),
          expectedWeeklyWeightChangeKg: '-0.5',
        },
      }),
    );
    expect(result.outcome).toBe(NutritionGoalReviewOutcome.REVIEW_RECOMMENDED);
    expect(result.reasons).toContain(NutritionGoalReviewReason.GOAL_EXPIRED);
  });

  it('includes the goal age threshold when the configured review age is reached', () => {
    const result = new NutritionGoalReviewEvaluator({
      minimumWeeksWithData: 4,
      minimumWeightRecords: 3,
      minimumTrackingDays: 14,
      minimumAdherence: '0.8',
      meaningfulWeeklyWeightChangeKg: '0.1',
      goalAgeWeeks: 4,
    }).evaluate(baseInput());
    expect(result.reasons).toContain(NutritionGoalReviewReason.GOAL_AGE_THRESHOLD);
  });

  it('honors an active postponement without changing the goal', () => {
    const result = new NutritionGoalReviewEvaluator().evaluate(
      baseInput({ priorReview: { reviewedAt: date(70), postponedUntil: date(100) } }),
    );
    expect(result).toEqual({
      outcome: NutritionGoalReviewOutcome.REVIEW_POSTPONED,
      reasons: [],
      actualWeeklyWeightChangeKg: null,
    });
  });
});
