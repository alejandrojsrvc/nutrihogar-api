import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { RecipeRepository } from '../ports/recipe-repository.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { NutritionEngineService } from '../../../nutrition/application/nutrition-engine.service';
import { Recipe } from '../../domain/entities/recipe';
import { RecipeArchivedError } from '../../domain/errors/recipe.errors';
import { PreparedBatchNotFoundError } from '../errors/prepared-batch-application.errors';
import { StartPreparedBatchUseCase } from './start-prepared-batch.use-case';
import { UpdatePreparedBatchIngredientsUseCase } from './update-prepared-batch-ingredients.use-case';
import { GetPreparedBatchUseCase } from './get-prepared-batch.use-case';
import { CancelPreparedBatchUseCase } from './cancel-prepared-batch.use-case';

describe('PreparedBatch lifecycle use cases', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let recipes: jest.Mocked<RecipeRepository>;
  let batches: jest.Mocked<PreparedBatchRepository>;
  let clock: jest.Mocked<Clock>;
  let save: jest.Mock;
  let findAccess: jest.Mock;
  let nutritionEngine: jest.Mocked<NutritionEngineService>;

  beforeEach(() => {
    save = jest.fn().mockResolvedValue(undefined);
    findAccess = jest.fn().mockResolvedValue({
      household: { id: 'household-id' },
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    households = {
      findActiveForUser: jest.fn(),
      findAccess,
      updateName: jest.fn(),
    };
    recipes = {
      findById: jest.fn().mockResolvedValue(recipe),
      findByIdForHousehold: jest.fn(),
      save: jest.fn(),
      existsByName: jest.fn(),
      listByHousehold: jest.fn(),
    };
    batches = {
      findById: jest.fn(),
      save,
      listAvailableByHousehold: jest.fn(),
    };
    clock = { now: jest.fn().mockReturnValue(now) };
    nutritionEngine = {
      calculate: jest.fn().mockResolvedValue({}),
      calculateMany: jest.fn(),
    } as unknown as jest.Mocked<NutritionEngineService>;
  });

  it('starts a draft by copying the recipe definition without calculating snapshots', async () => {
    const useCase = new StartPreparedBatchUseCase(
      households,
      recipes,
      batches,
      nutritionEngine,
      clock,
    );

    const result = await useCase.execute({ actorId: 'user-id', recipeId: 'recipe-id' });

    expect(result.status).toBe('DRAFT');
    expect(result.recipeNameSnapshot).toBe('Arroz con pollo');
    expect(result.ingredients[0]?.foodId).toBe('food-id');
    expect(result.ingredients[0]?.nutrients).toHaveLength(0);
    expect(save).toHaveBeenCalledWith(result);
  });

  it('rejects starting from an archived recipe', async () => {
    recipes.findById.mockResolvedValue(
      Recipe.reconstitute({ ...recipe.toProps(), status: 'ARCHIVED' }),
    );
    const useCase = new StartPreparedBatchUseCase(
      households,
      recipes,
      batches,
      nutritionEngine,
      clock,
    );

    await expect(
      useCase.execute({ actorId: 'user-id', recipeId: 'recipe-id' }),
    ).rejects.toBeInstanceOf(RecipeArchivedError);
  });

  it('updates a draft while preserving access and rejects unknown batch ids', async () => {
    const start = new StartPreparedBatchUseCase(
      households,
      recipes,
      batches,
      nutritionEngine,
      clock,
    );
    const batch = await start.execute({ actorId: 'user-id', recipeId: 'recipe-id' });
    batches.findById.mockResolvedValue(batch);
    const useCase = new UpdatePreparedBatchIngredientsUseCase(households, batches, nutritionEngine);

    await useCase.execute({
      actorId: 'user-id',
      batchId: batch.id,
      ingredients: [
        {
          id: batch.ingredients[0]?.id,
          foodId: 'food-id',
          quantity: 700,
          unit: 'GRAM',
          position: 1,
        },
      ],
    });

    expect(batch.ingredients[0]?.quantity.equals(700)).toBe(true);
    expect(save).toHaveBeenCalledWith(batch);

    await expect(
      useCase.execute({
        actorId: 'user-id',
        batchId: batch.id,
        ingredients: [
          { id: 'other-ingredient', foodId: 'food-id', quantity: 1, unit: 'GRAM', position: 1 },
        ],
      }),
    ).rejects.toThrow();
  });

  it('gets and cancels an accessible batch', async () => {
    const start = new StartPreparedBatchUseCase(
      households,
      recipes,
      batches,
      nutritionEngine,
      clock,
    );
    const batch = await start.execute({ actorId: 'user-id', recipeId: 'recipe-id' });
    batches.findById.mockResolvedValue(batch);

    const get = new GetPreparedBatchUseCase(households, batches);
    expect(await get.execute('user-id', batch.id)).toBe(batch);

    const cancel = new CancelPreparedBatchUseCase(households, batches, clock);
    await cancel.execute('user-id', batch.id);
    expect(batch.status).toBe('CANCELLED');
  });

  it('returns not found before checking authorization', async () => {
    batches.findById.mockResolvedValue(null);
    const get = new GetPreparedBatchUseCase(households, batches);

    await expect(get.execute('user-id', 'missing-id')).rejects.toBeInstanceOf(
      PreparedBatchNotFoundError,
    );
    expect(findAccess).not.toHaveBeenCalled();
  });
});

const now = new Date('2026-07-31T12:00:00.000Z');
const recipe = Recipe.create({
  id: 'recipe-id',
  householdId: 'household-id',
  createdById: 'user-id',
  name: 'Arroz con pollo',
  description: null,
  category: 'LUNCH',
  defaultServings: 4,
  estimatedPreparationMinutes: 60,
  tags: [],
  ingredients: [
    {
      id: 'recipe-ingredient-id',
      foodId: 'food-id',
      quantity: new Decimal(600),
      unit: 'GRAM',
      servingId: null,
      position: 1,
      notes: null,
    },
  ],
  instructions: [],
  createdAt: now,
  updatedAt: now,
});
