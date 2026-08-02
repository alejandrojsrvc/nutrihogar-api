import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import {
  NutritionGoalReviewAlreadyHandledError,
  NutritionGoalReviewNotFoundError,
  NutritionGoalReviewProposalRequiredError,
} from '../errors/nutrition-goal-review.errors';
import { NutritionGoalRepository } from '../ports/nutrition-goal-repository.port';
import {
  NutritionGoalReviewRepository,
  NutritionGoalReviewUnitOfWork,
} from '../ports/nutrition-goal-review-repository.port';
import { Clock } from '../ports/clock.port';

export const ACCEPT_NUTRITION_GOAL_REVIEW_USE_CASE = Symbol('AcceptNutritionGoalReviewUseCase');
export class AcceptNutritionGoalReviewUseCase {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly reviews: NutritionGoalReviewRepository,
    private readonly uow: NutritionGoalReviewUnitOfWork,
    private readonly clock: Clock,
  ) {}
  async execute(command: { actorId: string; adultProfileId: string }) {
    if (!(await this.goals.canAccessProfile(command.actorId, command.adultProfileId)))
      throw new NutritionGoalAccessDeniedError();
    const review = await this.reviews.findLatest(command.adultProfileId);
    if (!review) throw new NutritionGoalReviewNotFoundError();
    if (review.terminalAction) throw new NutritionGoalReviewAlreadyHandledError();
    if (review.postponedUntil && review.postponedUntil > this.clock.now())
      throw new NutritionGoalReviewProposalRequiredError();
    if (!review.proposalSuggestionId) throw new NutritionGoalReviewProposalRequiredError();
    const goal = await this.uow.acceptReview({
      reviewId: review.id,
      suggestionId: review.proposalSuggestionId,
      actorId: command.actorId,
      actedAt: this.clock.now(),
    });
    if (!goal) throw new NutritionGoalReviewAlreadyHandledError();
    return goal;
  }
}
