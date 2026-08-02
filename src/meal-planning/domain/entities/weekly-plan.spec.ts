import Decimal from 'decimal.js';
import { WeeklyPlan } from './weekly-plan';
import {
  InvalidMealPlanningError,
  MealPlanningTransitionError,
} from '../errors/meal-planning.errors';
import { PlannedMealSource, PlannedMealType } from '../value-objects/planned-meal';
import { PlannedMealStatus } from '../value-objects/planned-meal-status';
import { WeeklyPlanStatus } from '../value-objects/weekly-plan-status';

describe('WeeklyPlan', () => {
  const now = new Date('2026-08-03T10:00:00.000Z');
  const plan = () =>
    WeeklyPlan.create({
      id: 'plan-1',
      householdId: 'home-1',
      weekStart: '2026-08-03',
      createdBy: 'adult-1',
      createdAt: now,
    });
  const meal = (id: string, source = PlannedMealSource.RECIPE, position = 1) => ({
    id,
    date: '2026-08-03' as const,
    type: PlannedMealType.LUNCH,
    source,
    recipeId: source === PlannedMealSource.RECIPE ? 'recipe-1' : null,
    position,
    occurredAt: now,
  });

  it('requires a Monday and keeps exact decimal quantities', () => {
    expect(() =>
      WeeklyPlan.create({
        id: 'p',
        householdId: 'h',
        weekStart: '2026-08-04',
        createdBy: 'u',
        createdAt: now,
      }),
    ).toThrow(InvalidMealPlanningError);
    const weekly = plan();
    weekly.addMeal(meal('meal-1'));
    weekly.assignParticipant('meal-1', {
      id: 'participant-1',
      adultProfileId: 'adult-1',
      occurredAt: now,
    });
    weekly.confirmParticipantQuantity('meal-1', 'participant-1', '1.234567890123', 'portion', now);
    expect(
      weekly.meals[0].participants[0].confirmedQuantity?.equals(new Decimal('1.234567890123')),
    ).toBe(true);
    expect(weekly.meals[0].participants[0].confirmedById).toBe('legacy');
    expect(weekly.meals[0].participants[0].confirmedAt).toEqual(now);
  });

  it('validates recipe source and activation participants', () => {
    const weekly = plan();
    expect(() => weekly.addMeal({ ...meal('recipe-without-id'), recipeId: null })).toThrow(
      InvalidMealPlanningError,
    );
    weekly.addMeal(meal('free-meal', PlannedMealSource.FREE_MEAL, 2));
    expect(() => weekly.addMeal({ ...meal('bad'), recipeId: null })).toThrow(
      InvalidMealPlanningError,
    );
    expect(() => weekly.activate()).toThrow(MealPlanningTransitionError);
    weekly.assignParticipant('free-meal', {
      id: 'participant-1',
      adultProfileId: 'adult-1',
      occurredAt: now,
    });
    weekly.activate();
    expect(weekly.status).toBe(WeeklyPlanStatus.ACTIVE);
  });

  it('requires a previous meal id for previous meal entries', () => {
    const weekly = plan();

    expect(() =>
      weekly.addMeal(meal('previous-without-id', PlannedMealSource.PREVIOUS_MEAL)),
    ).toThrow(InvalidMealPlanningError);

    weekly.addMeal({
      ...meal('previous-meal', PlannedMealSource.PREVIOUS_MEAL),
      previousMealId: 'meal-from-history',
    });
    expect(weekly.meals[0].previousMealId).toBe('meal-from-history');
  });

  it('rejects duplicate participants and preserves replacement history', () => {
    const weekly = plan();
    weekly.addMeal(meal('meal-1'));
    weekly.assignParticipant('meal-1', {
      id: 'participant-1',
      adultProfileId: 'adult-1',
      occurredAt: now,
    });
    expect(() =>
      weekly.assignParticipant('meal-1', {
        id: 'participant-2',
        adultProfileId: 'adult-1',
        occurredAt: now,
      }),
    ).toThrow(InvalidMealPlanningError);
    weekly.replaceMeal('meal-1', {
      ...meal('meal-2'),
      occurredAt: new Date('2026-08-03T11:00:00Z'),
    });
    expect(weekly.meals.map((item) => item.status)).toEqual(['REPLACED', 'PLANNED']);
    expect(weekly.meals[1].replacedMealId).toBe('meal-1');
  });

  it('does not remove consumed meals and blocks completed plan edits', () => {
    const weekly = plan();
    weekly.addMeal(meal('meal-1'));
    weekly.assignParticipant('meal-1', {
      id: 'participant-1',
      adultProfileId: 'adult-1',
      occurredAt: now,
    });
    weekly.activate();
    const restored = WeeklyPlan.reconstitute(weekly.toProps());
    restored.complete();
    expect(() => restored.addMeal(meal('meal-2'))).toThrow(MealPlanningTransitionError);
    const draft = plan();
    draft.addMeal(meal('meal-3'));
    const withConsumed = WeeklyPlan.reconstitute({
      ...draft.toProps(),
      status: WeeklyPlanStatus.DRAFT,
      meals: [{ ...draft.meals[0], status: PlannedMealStatus.CONSUMED }],
      publishedAt: null,
    });
    expect(() => withConsumed.removeMeal('meal-3')).toThrow(MealPlanningTransitionError);
  });
});
