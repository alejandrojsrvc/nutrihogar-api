import Decimal from 'decimal.js';
import { InvalidNutritionGoalValuesError } from '../../domain/errors/nutrition-goal.errors';
import {
  NutritionGoalSuggestionView,
  NutritionGoalView,
} from '../../domain/models/nutrition-goal.models';
import {
  NutritionGoalAccessDeniedError,
  NutritionGoalSuggestionAlreadyHandledError,
  NutritionGoalSuggestionExpiredError,
} from '../errors/nutrition-goal.errors';
import { Clock } from '../ports/clock.port';
import {
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from '../ports/nutrition-goal-repository.port';
import { ConfirmNutritionGoalSuggestionUseCase } from './confirm-nutrition-goal-suggestion.use-case';
import { SaveNutritionGoalSuggestionUseCase } from './save-nutrition-goal-suggestion.use-case';

describe('Nutrition goal use cases', () => {
  let goals: jest.Mocked<NutritionGoalRepository>;
  let unitOfWork: jest.Mocked<NutritionGoalUnitOfWork>;
  let clock: Clock;

  beforeEach(() => {
    goals = {
      canAccessProfile: jest.fn().mockResolvedValue(true),
      findSuggestionById: jest.fn().mockResolvedValue(suggestion),
      findCurrentByProfile: jest.fn(),
      listByProfile: jest.fn(),
    };
    unitOfWork = {
      createSuggestion: jest.fn().mockResolvedValue(suggestion),
      confirmSuggestion: jest.fn().mockResolvedValue(goal),
      expireSuggestion: jest.fn().mockResolvedValue(undefined),
    };
    clock = { now: () => now };
  });

  it('saves a pending suggestion with positive decimal values and an input snapshot', async () => {
    const useCase = new SaveNutritionGoalSuggestionUseCase(goals, unitOfWork, clock);
    const calculationInput = { weightKg: 80, activity: 'MODERATE' };

    const result = await useCase.execute({
      actorId: 'user-id',
      adultProfileId: 'profile-id',
      calculationMethod: ' MIFFLIN_ST_JEOR ',
      calculationInput,
      bmr: '1800.25',
      tdee: '2500.75',
      suggestedCalories: 2200,
      suggestedProteinGrams: 170,
      suggestedCarbohydrateGrams: 230,
      suggestedFatGrams: 67,
      suggestedFiberGrams: 30,
      expiresAt,
    });

    expect(result).toBe(suggestion);
    const input = unitOfWork.createSuggestion.mock.calls[0]?.[0];
    expect(input?.calculationMethod).toBe('MIFFLIN_ST_JEOR');
    expect(input?.createdAt).toBe(now);
    expect(input?.calculationInput).toEqual(calculationInput);
    expect(input?.calculationInput).not.toBe(calculationInput);
    expect(input?.values.calories.equals(2200)).toBe(true);
  });

  it('rejects negative suggestion values', async () => {
    const useCase = new SaveNutritionGoalSuggestionUseCase(goals, unitOfWork, clock);

    await expect(
      useCase.execute({
        actorId: 'user-id',
        adultProfileId: 'profile-id',
        calculationMethod: 'METHOD',
        calculationInput: {},
        bmr: 1800,
        tdee: 2500,
        suggestedCalories: -1,
        suggestedProteinGrams: 170,
        suggestedCarbohydrateGrams: 230,
        suggestedFatGrams: 67,
        suggestedFiberGrams: 30,
        expiresAt,
      }),
    ).rejects.toBeInstanceOf(InvalidNutritionGoalValuesError);
  });

  it('rejects a profile from another household', async () => {
    goals.canAccessProfile.mockResolvedValue(false);
    const useCase = new SaveNutritionGoalSuggestionUseCase(goals, unitOfWork, clock);

    await expect(
      useCase.execute({
        actorId: 'user-id',
        adultProfileId: 'other-profile',
        calculationMethod: 'METHOD',
        calculationInput: {},
        bmr: 1800,
        tdee: 2500,
        suggestedCalories: 2200,
        suggestedProteinGrams: 170,
        suggestedCarbohydrateGrams: 230,
        suggestedFatGrams: 67,
        suggestedFiberGrams: 30,
        expiresAt,
      }),
    ).rejects.toBeInstanceOf(NutritionGoalAccessDeniedError);
  });

  it('confirms the first goal and allows edited values', async () => {
    const useCase = new ConfirmNutritionGoalSuggestionUseCase(goals, unitOfWork, clock);

    const result = await useCase.execute({
      actorId: 'user-id',
      suggestionId: 'suggestion-id',
      goalType: 'FAT_LOSS',
      dailyCalories: 2100,
    });

    expect(result).toBe(goal);
    const input = unitOfWork.confirmSuggestion.mock.calls[0]?.[0];
    expect(input?.adultProfileId).toBe('profile-id');
    expect(input?.confirmedById).toBe('user-id');
    expect(input?.confirmedAt).toBe(now);
    expect(input?.values.calories.equals(2100)).toBe(true);
    expect(input?.values.proteinGrams.equals(170)).toBe(true);
  });

  it('expires a pending suggestion instead of confirming it', async () => {
    goals.findSuggestionById.mockResolvedValue({
      ...suggestion,
      expiresAt: new Date('2026-07-30T11:59:59.000Z'),
    });
    const useCase = new ConfirmNutritionGoalSuggestionUseCase(goals, unitOfWork, clock);

    await expect(
      useCase.execute({
        actorId: 'user-id',
        suggestionId: 'suggestion-id',
        goalType: 'FAT_LOSS',
      }),
    ).rejects.toBeInstanceOf(NutritionGoalSuggestionExpiredError);

    expect(unitOfWork.expireSuggestion.mock.calls[0]?.[0]).toBe('suggestion-id');
    expect(unitOfWork.confirmSuggestion.mock.calls).toHaveLength(0);
  });

  it('rejects repeated confirmation', async () => {
    goals.findSuggestionById.mockResolvedValue({
      ...suggestion,
      status: 'CONFIRMED',
    });
    const useCase = new ConfirmNutritionGoalSuggestionUseCase(goals, unitOfWork, clock);

    await expect(
      useCase.execute({
        actorId: 'user-id',
        suggestionId: 'suggestion-id',
        goalType: 'FAT_LOSS',
      }),
    ).rejects.toBeInstanceOf(NutritionGoalSuggestionAlreadyHandledError);
  });
});

const now = new Date('2026-07-30T12:00:00.000Z');
const expiresAt = new Date('2026-07-31T12:00:00.000Z');

const values = {
  calories: new Decimal(2200),
  proteinGrams: new Decimal(170),
  carbohydrateGrams: new Decimal(230),
  fatGrams: new Decimal(67),
  fiberGrams: new Decimal(30),
};

const suggestion: NutritionGoalSuggestionView = {
  id: 'suggestion-id',
  adultProfileId: 'profile-id',
  calculationMethod: 'MIFFLIN_ST_JEOR',
  calculationInput: { weightKg: 80 },
  bmr: new Decimal('1800.25'),
  tdee: new Decimal('2500.75'),
  values,
  status: 'PENDING',
  createdAt: now,
  expiresAt,
};

const goal: NutritionGoalView = {
  id: 'goal-id',
  adultProfileId: 'profile-id',
  validFrom: now,
  validUntil: null,
  values,
  goalType: 'FAT_LOSS',
  calculationMethod: 'MIFFLIN_ST_JEOR',
  calculationInput: { weightKg: 80 },
  confirmedById: 'user-id',
  createdAt: now,
  updatedAt: now,
};
