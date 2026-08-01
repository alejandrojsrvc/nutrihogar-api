import { CreateWeeklyPlanUseCase } from './weekly-plan.use-cases';
import { AddPlannedMealUseCase } from './planned-meal.use-cases';
import { PlannedMealSource, PlannedMealType } from '../../domain/value-objects/planned-meal';
import { WeeklyPlanStatus } from '../../domain/value-objects/weekly-plan-status';
import type { HouseholdAccess } from '../../../households/application/models/household-access';
import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type { RecipeRepository } from '../../../recipes/application/ports/recipe-repository.port';
import type { WeeklyPlanRepository } from '../ports/weekly-plan-repository.port';

describe('meal planning use cases', () => {
  const access: HouseholdAccess = {
    household: {
      id: 'home',
      name: 'Home',
      timezone: 'UTC',
      currency: 'ARS',
      weeklyBudget: null,
      createdById: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    role: 'MEMBER',
    status: 'ACTIVE',
  };
  const households: jest.Mocked<HouseholdRepository> = {
    findAccess: jest.fn().mockResolvedValue(access),
    findActiveForUser: jest.fn(),
    updateName: jest.fn(),
  };
  const plans: jest.Mocked<WeeklyPlanRepository> = {
    findByHouseholdAndWeek: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByMealId: jest.fn(),
    findByParticipantId: jest.fn(),
    deleteParticipant: jest.fn(),
    listByHousehold: jest.fn(),
  };
  const recipes: jest.Mocked<RecipeRepository> = {
    findByIdForHousehold: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    existsByName: jest.fn(),
    listByHousehold: jest.fn(),
  };

  it('uses household currency and rejects an active duplicate week', async () => {
    plans.findByHouseholdAndWeek.mockResolvedValueOnce(null);
    const created = await new CreateWeeklyPlanUseCase(households, plans).execute({
      actorId: 'user',
      householdId: 'home',
      weekStart: '2026-08-03',
    });
    expect(created.currency).toBe('ARS');
    plans.findByHouseholdAndWeek.mockResolvedValueOnce({
      status: WeeklyPlanStatus.ACTIVE,
    } as never);
    await expect(
      new CreateWeeklyPlanUseCase(households, plans).execute({
        actorId: 'user',
        householdId: 'home',
        weekStart: '2026-08-03',
      }),
    ).rejects.toThrow('active plan');
  });

  it('requires an active household-visible recipe for recipe meals', async () => {
    const plan = await new CreateWeeklyPlanUseCase(households, plans).execute({
      actorId: 'user',
      householdId: 'home',
      weekStart: '2026-08-10',
    });
    plans.findById.mockResolvedValue(plan);
    recipes.findByIdForHousehold.mockResolvedValue(null);
    await expect(
      new AddPlannedMealUseCase({ households, plans, recipes }).execute({
        actorId: 'user',
        planId: plan.id,
        date: '2026-08-10',
        type: PlannedMealType.LUNCH,
        source: PlannedMealSource.RECIPE,
        recipeId: 'recipe',
        position: 0,
      }),
    ).rejects.toThrow('Recipe');
  });
});
