import Decimal from 'decimal.js';
import {
  IncompleteNutritionGoalProfileError,
  InvalidNutritionGoalProfileAgeError,
  NutritionGoalAccessDeniedError,
} from '../errors/nutrition-goal.errors';
import { Clock } from '../ports/clock.port';
import {
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from '../ports/nutrition-goal-repository.port';
import {
  NutritionCalculationProfile,
  NutritionProfileRepository,
} from '../ports/nutrition-profile-repository.port';
import { NutritionGoalSuggestionView } from '../../domain/models/nutrition-goal.models';
import { NutritionGoalCalculator } from '../../domain/services/nutrition-goal-calculator';
import { GenerateNutritionGoalSuggestionUseCase } from './generate-nutrition-goal-suggestion.use-case';

describe('GenerateNutritionGoalSuggestionUseCase', () => {
  let goals: jest.Mocked<NutritionGoalRepository>;
  let profiles: jest.Mocked<NutritionProfileRepository>;
  let unitOfWork: jest.Mocked<NutritionGoalUnitOfWork>;
  let useCase: GenerateNutritionGoalSuggestionUseCase;

  beforeEach(() => {
    goals = {
      canAccessProfile: jest.fn().mockResolvedValue(true),
      findSuggestionById: jest.fn(),
      findCurrentByProfile: jest.fn(),
      listByProfile: jest.fn(),
    };
    profiles = { findActiveById: jest.fn().mockResolvedValue(profile) };
    unitOfWork = {
      createSuggestion: jest.fn().mockResolvedValue(suggestion),
      confirmSuggestion: jest.fn(),
      rejectSuggestion: jest.fn(),
      expireSuggestion: jest.fn(),
    };
    const clock: Clock = { now: () => now };
    useCase = new GenerateNutritionGoalSuggestionUseCase(
      goals,
      profiles,
      unitOfWork,
      new NutritionGoalCalculator(),
      clock,
    );
  });

  it('calculates and persists a pending suggestion with the complete input snapshot', async () => {
    const result = await useCase.execute({
      actorId: 'user-id',
      adultProfileId: profile.id,
    });

    expect(result.suggestion.status).toBe('PENDING');
    expect(result.suggestion.values.calories.toNumber()).toBe(2131);
    expect(unitOfWork.createSuggestion.mock.calls).toHaveLength(1);
    expect(unitOfWork.createSuggestion.mock.calls[0]?.[0]).toMatchObject({
      adultProfileId: profile.id,
      calculationMethod: 'MIFFLIN_ST_JEOR_V1',
      calculationInput: {
        age: 36,
        biologicalSex: 'MALE',
        weightKg: 80,
        heightCm: 175,
        activityLevel: 'MODERATE',
        activityFactor: 1.55,
        primaryGoal: 'FAT_LOSS',
        calorieAdjustment: -0.2,
      },
      createdAt: now,
      expiresAt: new Date('2026-08-06T12:00:00.000Z'),
    });
  });

  it('rejects a profile without weight', async () => {
    profiles.findActiveById.mockResolvedValue({ ...profile, weightKg: null });

    await expect(
      useCase.execute({ actorId: 'user-id', adultProfileId: profile.id }),
    ).rejects.toEqual(new IncompleteNutritionGoalProfileError('weightKg'));
    expect(unitOfWork.createSuggestion.mock.calls).toHaveLength(0);
  });

  it('rejects a profile without height', async () => {
    profiles.findActiveById.mockResolvedValue({ ...profile, heightCm: null });

    await expect(
      useCase.execute({ actorId: 'user-id', adultProfileId: profile.id }),
    ).rejects.toEqual(new IncompleteNutritionGoalProfileError('heightCm'));
  });

  it('rejects an invalid adult birth date', async () => {
    profiles.findActiveById.mockResolvedValue({
      ...profile,
      birthDate: new Date('2010-01-01T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({ actorId: 'user-id', adultProfileId: profile.id }),
    ).rejects.toBeInstanceOf(InvalidNutritionGoalProfileAgeError);
  });

  it('rejects an unauthorized household member', async () => {
    goals.canAccessProfile.mockResolvedValue(false);

    await expect(
      useCase.execute({ actorId: 'outsider-id', adultProfileId: profile.id }),
    ).rejects.toBeInstanceOf(NutritionGoalAccessDeniedError);
    expect(profiles.findActiveById.mock.calls).toHaveLength(0);
  });
});

const now = new Date('2026-07-30T12:00:00.000Z');
const profile: NutritionCalculationProfile = {
  id: 'profile-id',
  birthDate: new Date('1990-05-20T00:00:00.000Z'),
  biologicalSex: 'MALE',
  weightKg: 80,
  heightCm: 175,
  activityLevel: 'MODERATE',
  primaryGoal: 'FAT_LOSS',
};

const suggestion: NutritionGoalSuggestionView = {
  id: 'suggestion-id',
  adultProfileId: profile.id,
  calculationMethod: 'MIFFLIN_ST_JEOR_V1',
  calculationInput: {},
  bmr: new Decimal(1719),
  tdee: new Decimal(2664),
  values: {
    calories: new Decimal(2131),
    proteinGrams: new Decimal(160),
    carbohydrateGrams: new Decimal(240),
    fatGrams: new Decimal(59),
    fiberGrams: new Decimal(30),
  },
  status: 'PENDING',
  createdAt: now,
  expiresAt: new Date('2026-08-06T12:00:00.000Z'),
};
