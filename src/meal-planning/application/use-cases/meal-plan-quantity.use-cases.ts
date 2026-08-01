import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type { NutritionGoalRepository } from '../../../nutrition/application/ports/nutrition-goal-repository.port';
import type { WeeklyPlan } from '../../domain/entities/weekly-plan';
import type { PlannedMealProps } from '../../domain/models/meal-planning.models';
import type { WeeklyPlanRepository } from '../ports/weekly-plan-repository.port';
import { requireAccess } from './weekly-plan.use-cases';
import {
  participantQuantity,
  suggestQuantities,
  type QuantitySuggestion,
} from '../services/quantity-suggestion.service';
import { PlannedMealNotFoundError } from '../errors/meal-planning-application.errors';

export const PROPOSE_MEAL_QUANTITIES_USE_CASE = Symbol('ProposeMealQuantitiesUseCase');
export const GET_PLANNED_MEAL_QUANTITIES_QUERY = Symbol('GetPlannedMealQuantitiesQuery');
export const ACCEPT_SUGGESTED_QUANTITIES_USE_CASE = Symbol('AcceptSuggestedQuantitiesUseCase');

type Deps = {
  households: HouseholdRepository;
  plans: WeeklyPlanRepository;
  goals: NutritionGoalRepository;
};

export class ProposeMealQuantitiesUseCase {
  constructor(private readonly d: Deps) {}
  async execute(actorId: string, mealId: string): Promise<QuantitySuggestion[]> {
    const plan = await this.d.plans.findByMealId(mealId);
    if (!plan) throw new PlannedMealNotFoundError('Planned meal not found.');
    await requireAccess(this.d.households, actorId, plan.householdId);
    const meal = plan.meals.find((item) => item.id === mealId);
    if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
    const suggestions = await propose(meal, this.d.goals);
    for (const suggestion of suggestions) {
      plan.updateParticipant(meal.id, suggestion.participantId, {
        suggestedQuantity: suggestion.quantity,
        suggestedUnit: suggestion.unit,
        nutritionTargetSnapshot: {
          goalValidFrom: suggestion.goalValidFrom.toISOString(),
          targetCalories: suggestion.targetCalories,
        },
        occurredAt: new Date(),
      });
    }
    await this.d.plans.save(plan);
    return suggestions;
  }
}

export class GetPlannedMealQuantitiesQuery {
  constructor(private readonly d: Deps) {}
  async execute(actorId: string, mealId: string): Promise<QuantitySuggestion[]> {
    const plan = await this.d.plans.findByMealId(mealId);
    if (!plan) throw new PlannedMealNotFoundError('Planned meal not found.');
    await requireAccess(this.d.households, actorId, plan.householdId);
    const meal = plan.meals.find((item) => item.id === mealId);
    if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
    const suggestions = await propose(meal, this.d.goals);
    const byParticipant = new Map(
      suggestions.map((suggestion) => [suggestion.participantId, suggestion]),
    );
    return meal.participants.map((participant) => {
      const suggestion = byParticipant.get(participant.id) ?? {
        participantId: participant.id,
        adultProfileId: participant.adultProfileId,
        quantity: '',
        unit: '',
        goalValidFrom: new Date(0),
        targetCalories: '',
      };
      const quantity = participantQuantity(participant);
      return quantity
        ? { ...suggestion, quantity: quantity.quantity.toString(), unit: quantity.unit }
        : suggestion;
    });
  }
}

export class AcceptSuggestedQuantitiesUseCase {
  constructor(private readonly d: Deps) {}
  async execute(actorId: string, mealId: string): Promise<WeeklyPlan> {
    const plan = await this.d.plans.findByMealId(mealId);
    if (!plan) throw new PlannedMealNotFoundError('Planned meal not found.');
    await requireAccess(this.d.households, actorId, plan.householdId);
    const meal = plan.meals.find((item) => item.id === mealId);
    if (!meal) throw new PlannedMealNotFoundError('Planned meal not found.');
    const suggestions = await propose(meal, this.d.goals);
    for (const suggestion of suggestions)
      plan.confirmParticipantQuantity(
        meal.id,
        suggestion.participantId,
        suggestion.quantity,
        suggestion.unit,
        actorId,
      );
    await this.d.plans.save(plan);
    return plan;
  }
}

async function propose(
  meal: PlannedMealProps,
  goals: NutritionGoalRepository,
): Promise<QuantitySuggestion[]> {
  const entries = await Promise.all(
    meal.participants.map(
      async (participant) =>
        [
          participant.adultProfileId,
          await goals.findCurrentByProfile(participant.adultProfileId),
        ] as const,
    ),
  );
  return suggestQuantities(meal, new Map(entries));
}
