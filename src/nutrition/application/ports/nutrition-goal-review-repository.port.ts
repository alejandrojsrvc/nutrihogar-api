import {
  NutritionGoalReviewData,
  NutritionGoalReviewView,
} from '../../domain/models/nutrition-goal-review.models';
import {
  NutritionGoalReviewOutcome,
  NutritionGoalReviewReason,
} from '../../domain/services/nutrition-goal-review-evaluator';
import {
  NutritionGoalView,
  NutritionGoalSuggestionView,
} from '../../domain/models/nutrition-goal.models';

export const NUTRITION_GOAL_REVIEW_REPOSITORY = Symbol('NutritionGoalReviewRepository');
export const NUTRITION_GOAL_REVIEW_UNIT_OF_WORK = Symbol('NutritionGoalReviewUnitOfWork');

export interface NutritionGoalReviewRepository {
  findLatest(profileId: string): Promise<NutritionGoalReviewView | null>;
  collectData(profileId: string, from: Date, to: Date): Promise<NutritionGoalReviewData>;
}

export interface CreateNutritionGoalReviewInput {
  adultProfileId: string;
  outcome: NutritionGoalReviewOutcome;
  reasons: readonly NutritionGoalReviewReason[];
  evaluatedAt: Date;
  postponedUntil: Date | null;
}

export interface NutritionGoalReviewUnitOfWork {
  createReview(input: CreateNutritionGoalReviewInput): Promise<NutritionGoalReviewView>;
  attachProposal(reviewId: string, suggestionId: string): Promise<NutritionGoalReviewView>;
  rejectReview(
    reviewId: string,
    actorId: string,
    actedAt: Date,
  ): Promise<NutritionGoalReviewView | null>;
  postponeReview(
    reviewId: string,
    actorId: string,
    postponedUntil: Date,
    actedAt: Date,
  ): Promise<NutritionGoalReviewView | null>;
  acceptReview(input: {
    reviewId: string;
    suggestionId: string;
    actorId: string;
    actedAt: Date;
  }): Promise<NutritionGoalView | null>;
}

export type NutritionGoalReviewProposal = {
  review: NutritionGoalReviewView;
  proposal: NutritionGoalSuggestionView;
};
