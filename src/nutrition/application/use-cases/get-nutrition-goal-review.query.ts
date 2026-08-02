import { NutritionGoalAccessDeniedError } from '../errors/nutrition-goal.errors';
import { NutritionGoalReviewNoCurrentGoalError } from '../errors/nutrition-goal-review.errors';
import { Clock } from '../ports/clock.port';
import { NutritionGoalRepository } from '../ports/nutrition-goal-repository.port';
import {
  NutritionGoalReviewRepository,
  NutritionGoalReviewUnitOfWork,
} from '../ports/nutrition-goal-review-repository.port';
import { NutritionGoalReviewEvaluator } from '../../domain/services/nutrition-goal-review-evaluator';
import { reviewInput, isTerminal } from './nutrition-goal-review.helpers';
import { differences } from '../../domain/models/nutrition-goal-review.models';

export const GET_NUTRITION_GOAL_REVIEW_QUERY = Symbol('GetNutritionGoalReviewQuery');
export interface GetNutritionGoalReviewCommand {
  actorId: string;
  adultProfileId: string;
}

export class GetNutritionGoalReviewQuery {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly reviews: NutritionGoalReviewRepository,
    private readonly uow: NutritionGoalReviewUnitOfWork,
    private readonly evaluator: NutritionGoalReviewEvaluator,
    private readonly clock: Clock,
  ) {}

  async execute(command: GetNutritionGoalReviewCommand) {
    await assertAccess(this.goals, command);
    const currentGoal = await this.goals.findCurrentByProfile(command.adultProfileId);
    if (!currentGoal) throw new NutritionGoalReviewNoCurrentGoalError();
    const now = this.clock.now();
    const prior = await this.reviews.findLatest(command.adultProfileId);
    if (
      prior &&
      (isTerminal(prior.terminalAction) || (prior.postponedUntil && prior.postponedUntil > now))
    ) {
      const proposal = prior.proposalSuggestionId
        ? await this.goals.findSuggestionById(prior.proposalSuggestionId)
        : null;
      return {
        review: prior,
        currentGoal,
        proposal,
        differences: proposal ? differences(currentGoal.values, proposal.values) : null,
      };
    }
    if (prior?.proposalSuggestionId) {
      const proposal = await this.goals.findSuggestionById(prior.proposalSuggestionId);
      if (proposal?.status === 'PENDING')
        return {
          review: prior,
          currentGoal,
          proposal,
          differences: differences(currentGoal.values, proposal.values),
        };
    }
    if (prior && !prior.terminalAction) {
      return { review: prior, currentGoal, proposal: null, differences: null };
    }
    const data = await this.reviews.collectData(command.adultProfileId, currentGoal.validFrom, now);
    const evaluated = this.evaluator.evaluate({
      ...reviewInput(currentGoal, data, now),
      priorReview: prior
        ? { reviewedAt: prior.evaluatedAt, postponedUntil: prior.postponedUntil }
        : undefined,
    });
    const review = await this.uow.createReview({
      adultProfileId: command.adultProfileId,
      outcome: evaluated.outcome,
      reasons: evaluated.reasons,
      evaluatedAt: now,
      postponedUntil: prior?.postponedUntil ?? null,
    });
    return { review, currentGoal, proposal: null, differences: null };
  }
}

export async function assertAccess(
  goals: NutritionGoalRepository,
  command: GetNutritionGoalReviewCommand,
): Promise<void> {
  if (!(await goals.canAccessProfile(command.actorId, command.adultProfileId)))
    throw new NutritionGoalAccessDeniedError();
}
