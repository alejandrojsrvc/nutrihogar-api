import {
  NutritionGoal,
  NutritionGoalSuggestion,
  NutritionGoalSuggestionStatus,
  Prisma,
} from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaNutritionGoalUnitOfWork } from './prisma-nutrition-goal.unit-of-work';

describe('PrismaNutritionGoalUnitOfWork', () => {
  it('persists a pending suggestion with its calculation snapshot', async () => {
    const create = jest.fn().mockResolvedValue(suggestionRecord);
    const unitOfWork = new PrismaNutritionGoalUnitOfWork({
      nutritionGoalSuggestion: { create },
    } as unknown as PrismaService);

    const result = await unitOfWork.createSuggestion({
      adultProfileId: 'profile-id',
      calculationMethod: 'MIFFLIN_ST_JEOR',
      calculationInput: { weightKg: 80 },
      bmr: new Decimal(1800),
      tdee: new Decimal(2500),
      values,
      createdAt: now,
      expiresAt,
    });

    expect(result.status).toBe('PENDING');
    expect(create).toHaveBeenCalledWith({
      data: {
        adultProfileId: 'profile-id',
        calculationMethod: 'MIFFLIN_ST_JEOR',
        calculationInput: { weightKg: 80 },
        bmr: '1800',
        tdee: '2500',
        suggestedCalories: '2200',
        suggestedProteinGrams: '170',
        suggestedCarbohydrateGrams: '230',
        suggestedFatGrams: '67',
        suggestedFiberGrams: '30',
        status: 'PENDING',
        createdAt: now,
        expiresAt,
      },
    });
  });

  it('claims the suggestion, closes only the active goal and creates the next version', async () => {
    const claim = jest.fn().mockResolvedValue({ count: 1 });
    const closeActive = jest.fn().mockResolvedValue({ count: 1 });
    const createGoal = jest.fn().mockResolvedValue(goalRecord);
    const transactionClient = {
      nutritionGoalSuggestion: { updateMany: claim },
      nutritionGoal: { updateMany: closeActive, create: createGoal },
    };
    const transaction = jest.fn(
      async (callback: (client: typeof transactionClient) => Promise<NutritionGoal | null>) =>
        callback(transactionClient),
    );
    const unitOfWork = new PrismaNutritionGoalUnitOfWork({
      $transaction: transaction,
    } as unknown as PrismaService);

    const result = await unitOfWork.confirmSuggestion({
      suggestionId: 'suggestion-id',
      adultProfileId: 'profile-id',
      confirmedById: 'user-id',
      confirmedAt: now,
      values,
      goalType: 'FAT_LOSS',
      calculationMethod: 'MIFFLIN_ST_JEOR',
      calculationInput: { weightKg: 80 },
    });

    expect(result?.id).toBe('new-goal-id');
    expect(claim).toHaveBeenCalledWith({
      where: {
        id: 'suggestion-id',
        status: 'PENDING',
        expiresAt: { gt: now },
      },
      data: { status: 'CONFIRMED' },
    });
    expect(closeActive).toHaveBeenCalledWith({
      where: { adultProfileId: 'profile-id', validUntil: null },
      data: { validUntil: now },
    });
    expect(createGoal).toHaveBeenCalledWith({
      data: {
        adultProfileId: 'profile-id',
        validFrom: now,
        dailyCalories: '2200',
        proteinGrams: '170',
        carbohydrateGrams: '230',
        fatGrams: '67',
        fiberGrams: '30',
        goalType: 'FAT_LOSS',
        calculationMethod: 'MIFFLIN_ST_JEOR',
        calculationInput: { weightKg: 80 },
        confirmedById: 'user-id',
      },
    });
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

const suggestionRecord: NutritionGoalSuggestion = {
  id: 'suggestion-id',
  adultProfileId: 'profile-id',
  calculationMethod: 'MIFFLIN_ST_JEOR',
  calculationInput: { weightKg: 80 },
  bmr: new Prisma.Decimal(1800),
  tdee: new Prisma.Decimal(2500),
  suggestedCalories: new Prisma.Decimal(2200),
  suggestedProteinGrams: new Prisma.Decimal(170),
  suggestedCarbohydrateGrams: new Prisma.Decimal(230),
  suggestedFatGrams: new Prisma.Decimal(67),
  suggestedFiberGrams: new Prisma.Decimal(30),
  status: NutritionGoalSuggestionStatus.PENDING,
  createdAt: now,
  expiresAt,
};

const goalRecord: NutritionGoal = {
  id: 'new-goal-id',
  adultProfileId: 'profile-id',
  validFrom: now,
  validUntil: null,
  dailyCalories: new Prisma.Decimal(2200),
  proteinGrams: new Prisma.Decimal(170),
  carbohydrateGrams: new Prisma.Decimal(230),
  fatGrams: new Prisma.Decimal(67),
  fiberGrams: new Prisma.Decimal(30),
  goalType: 'FAT_LOSS',
  calculationMethod: 'MIFFLIN_ST_JEOR',
  calculationInput: { weightKg: 80 },
  confirmedById: 'user-id',
  createdAt: now,
  updatedAt: now,
};
