import { AcceptNutritionGoalReviewUseCase } from './accept-nutrition-goal-review.use-case';
import { RejectNutritionGoalReviewUseCase } from './reject-nutrition-goal-review.use-case';
import { PostponeNutritionGoalReviewUseCase } from './postpone-nutrition-goal-review.use-case';
import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import { NutritionGoalReviewProposalRequiredError } from '../errors/nutrition-goal-review.errors';
import { GetNutritionGoalReviewQuery } from './get-nutrition-goal-review.query';
import { GenerateReviewedNutritionGoalProposalUseCase } from './generate-reviewed-nutrition-goal-proposal.use-case';
import Decimal from 'decimal.js';

const now = new Date('2026-08-01T12:00:00.000Z');
const review = (overrides = {}) => ({
  id: 'review-1',
  adultProfileId: 'profile-1',
  outcome: 'REVIEW_RECOMMENDED' as const,
  reasons: [],
  evaluatedAt: now,
  postponedUntil: null,
  proposalSuggestionId: 'suggestion-1',
  terminalAction: null,
  actedById: null,
  actedAt: null,
  ...overrides,
});
const clock = { now: () => now };
const goalRepo = { canAccessProfile: jest.fn().mockResolvedValue(true) };
const reviewRepo = { findLatest: jest.fn().mockResolvedValue(review()) };
const uow = {
  acceptReview: jest.fn().mockResolvedValue({ id: 'goal-2' }),
  rejectReview: jest.fn(),
  postponeReview: jest.fn(),
};

describe('nutrition goal review use cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    goalRepo.canAccessProfile.mockResolvedValue(true);
    reviewRepo.findLatest.mockResolvedValue(review());
  });

  it('requires access and a persisted proposal before accepting', async () => {
    const useCase = new AcceptNutritionGoalReviewUseCase(
      goalRepo as any,
      reviewRepo as any,
      uow as any,
      clock,
    );
    await expect(
      useCase.execute({ actorId: 'other', adultProfileId: 'profile-1' }),
    ).resolves.toEqual({ id: 'goal-2' });
    expect(uow.acceptReview).toHaveBeenCalledWith(
      expect.objectContaining({ suggestionId: 'suggestion-1' }),
    );
    goalRepo.canAccessProfile.mockResolvedValueOnce(false);
    await expect(
      useCase.execute({ actorId: 'other', adultProfileId: 'profile-1' }),
    ).rejects.toBeInstanceOf(NutritionGoalAccessDeniedError);
    reviewRepo.findLatest.mockResolvedValueOnce(review({ proposalSuggestionId: null }));
    await expect(
      useCase.execute({ actorId: 'actor', adultProfileId: 'profile-1' }),
    ).rejects.toBeInstanceOf(NutritionGoalReviewProposalRequiredError);
  });

  it('rejects and postpones through the UoW, preserving idempotent actions', async () => {
    const rejected = review({ terminalAction: 'REJECTED' });
    const rejectUow = { rejectReview: jest.fn() };
    reviewRepo.findLatest.mockResolvedValue(rejected);
    await expect(
      new RejectNutritionGoalReviewUseCase(
        goalRepo as any,
        reviewRepo as any,
        rejectUow as any,
        clock,
      ).execute({ actorId: 'actor', adultProfileId: 'profile-1' }),
    ).resolves.toBe(rejected);
    const postponed = review({
      terminalAction: 'POSTPONED',
      postponedUntil: new Date('2026-08-10T00:00:00.000Z'),
    });
    reviewRepo.findLatest.mockResolvedValue(postponed);
    const postponeUow = { postponeReview: jest.fn() };
    await expect(
      new PostponeNutritionGoalReviewUseCase(
        goalRepo as any,
        reviewRepo as any,
        postponeUow as any,
        clock,
      ).execute({
        actorId: 'actor',
        adultProfileId: 'profile-1',
        postponedUntil: new Date('2026-08-09T00:00:00.000Z'),
      }),
    ).resolves.toBe(postponed);
    expect(postponeUow.postponeReview).not.toHaveBeenCalled();
  });

  it('evaluates and persists status, while an active postponement is returned without new evaluation', async () => {
    const currentGoal = {
      id: 'goal-1',
      validFrom: new Date('2026-01-01'),
      validUntil: null,
      calculationInput: { primaryGoal: 'MAINTENANCE' },
    };
    const reviewRepo = {
      findLatest: jest.fn().mockResolvedValue(null),
      findSuggestionById: jest.fn().mockResolvedValue(null),
      collectData: jest.fn().mockResolvedValue({
        initialWeight: { recordedAt: now, weightKg: '80' },
        recentWeights: [],
        recentMeasurements: [],
        calorieAdherence: '1',
        proteinAdherence: '1',
        trackingDays: 14,
        activityLevelChanged: false,
        profileDataChanged: false,
      }),
    };
    const reviewUow = { createReview: jest.fn().mockResolvedValue(review()) };
    const goals = {
      canAccessProfile: jest.fn().mockResolvedValue(true),
      findCurrentByProfile: jest.fn().mockResolvedValue(currentGoal),
      findSuggestionById: jest.fn().mockResolvedValue(null),
    };
    const evaluator = {
      evaluate: jest
        .fn()
        .mockReturnValue({ outcome: 'REVIEW_RECOMMENDED', reasons: ['GOAL_AGE_THRESHOLD'] }),
    };
    const query = new GetNutritionGoalReviewQuery(
      goals as any,
      reviewRepo,
      reviewUow as any,
      evaluator as any,
      clock,
    );
    await query.execute({ actorId: 'actor', adultProfileId: 'profile-1' });
    expect(evaluator.evaluate).toHaveBeenCalled();
    expect(reviewUow.createReview).toHaveBeenCalled();
    const active = review({ terminalAction: 'POSTPONED', postponedUntil: new Date('2026-08-10') });
    reviewRepo.findLatest.mockResolvedValue(active);
    await expect(
      query.execute({ actorId: 'actor', adultProfileId: 'profile-1' }),
    ).resolves.toMatchObject({ review: active });
    expect(evaluator.evaluate).toHaveBeenCalledTimes(1);
  });

  it('returns proposal differences and does not pass editable values to acceptance', async () => {
    const values = {
      calories: new Decimal(2000),
      proteinGrams: new Decimal(100),
      carbohydrateGrams: new Decimal(200),
      fatGrams: new Decimal(60),
      fiberGrams: new Decimal(25),
    };
    const proposal = { id: 'suggestion-1', values };
    const state = {
      review: review(),
      currentGoal: { values: { ...values, calories: new Decimal(1800) } },
    };
    const preview = new GenerateReviewedNutritionGoalProposalUseCase(
      { findSuggestionById: jest.fn().mockResolvedValue(proposal) } as any,
      { execute: jest.fn().mockResolvedValue(state) } as any,
      {} as any,
      {} as any,
      clock,
    );
    const result = await preview.execute({ actorId: 'actor', adultProfileId: 'profile-1' });
    expect(result.differences.calories.toNumber()).toBe(200);
    expect(result).not.toHaveProperty('dailyCalories');
  });
});
