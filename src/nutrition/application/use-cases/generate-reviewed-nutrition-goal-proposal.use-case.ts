import { GenerateNutritionGoalSuggestionUseCase } from './generate-nutrition-goal-suggestion.use-case';
import { GetNutritionGoalReviewQuery } from './get-nutrition-goal-review.query';
import { NutritionGoalReviewUnitOfWork } from '../ports/nutrition-goal-review-repository.port';
import { NutritionGoalReviewPostponedError } from '../errors/nutrition-goal-review.errors';
import { NutritionGoalRepository } from '../ports/nutrition-goal-repository.port';
import { differences } from '../../domain/models/nutrition-goal-review.models';
import { Clock } from '../ports/clock.port';

export const GENERATE_REVIEWED_NUTRITION_GOAL_PROPOSAL_USE_CASE = Symbol(
  'GenerateReviewedNutritionGoalProposalUseCase',
);
export class GenerateReviewedNutritionGoalProposalUseCase {
  constructor(
    private readonly goals: NutritionGoalRepository,
    private readonly review: GetNutritionGoalReviewQuery,
    private readonly uow: NutritionGoalReviewUnitOfWork,
    private readonly generate: GenerateNutritionGoalSuggestionUseCase,
    private readonly clock: Clock,
  ) {}
  async execute(command: { actorId: string; adultProfileId: string }) {
    const state = await this.review.execute(command);
    if (state.review.postponedUntil && state.review.postponedUntil > this.clock.now())
      throw new NutritionGoalReviewPostponedError();
    if (state.review.proposalSuggestionId) {
      const proposal = await this.goals.findSuggestionById(state.review.proposalSuggestionId);
      if (proposal)
        return {
          ...state,
          proposal,
          differences: state.currentGoal
            ? differences(state.currentGoal.values, proposal.values)
            : null,
        };
    }
    const generated = await this.generate.execute(command);
    const review = await this.uow.attachProposal(state.review.id, generated.suggestion.id);
    return {
      ...state,
      review,
      proposal: generated.suggestion,
      differences: state.currentGoal
        ? differences(state.currentGoal.values, generated.suggestion.values)
        : null,
    };
  }
}
