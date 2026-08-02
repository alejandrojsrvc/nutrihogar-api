import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import {
  NutritionGoalReviewAlreadyHandledError,
  NutritionGoalReviewNotFoundError,
} from '../errors/nutrition-goal-review.errors';
import { NutritionGoalRepository } from '../ports/nutrition-goal-repository.port';
import {
  NutritionGoalReviewRepository,
  NutritionGoalReviewUnitOfWork,
} from '../ports/nutrition-goal-review-repository.port';
import { Clock } from '../ports/clock.port';
export const REJECT_NUTRITION_GOAL_REVIEW_USE_CASE = Symbol('RejectNutritionGoalReviewUseCase');
export class RejectNutritionGoalReviewUseCase {
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
    if (review.terminalAction === 'REJECTED') return review;
    if (review.terminalAction) throw new NutritionGoalReviewAlreadyHandledError();
    const result = await this.uow.rejectReview(review.id, command.actorId, this.clock.now());
    if (!result) throw new NutritionGoalReviewAlreadyHandledError();
    return result;
  }
}
