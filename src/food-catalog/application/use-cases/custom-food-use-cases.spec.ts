/* eslint-disable @typescript-eslint/unbound-method */
import {
  FoodHouseholdAccessDeniedError,
  FoodModificationNotAllowedError,
  InvalidFoodInputError,
} from '../errors/food-catalog-mutation.errors';
import { FoodDetailView, NutrientDefinitionView } from '../models/food-catalog.models';
import {
  FoodCatalogMutationRepository,
  FoodCatalogUnitOfWork,
  FoodHouseholdAccessRepository,
} from '../ports/food-catalog-mutation.port';
import { FoodCatalogReadRepository } from '../ports/food-catalog-read-repository.port';
import {
  CreateCustomFoodUseCase,
  DeleteCustomFoodUseCase,
  UpdateCustomFoodUseCase,
} from './custom-food-use-cases';

describe('Custom food use cases', () => {
  let access: jest.Mocked<FoodHouseholdAccessRepository>;
  let mutations: jest.Mocked<FoodCatalogMutationRepository>;
  let catalog: jest.Mocked<FoodCatalogReadRepository>;
  let unitOfWork: jest.Mocked<FoodCatalogUnitOfWork>;

  beforeEach(() => {
    access = { isActiveMember: jest.fn().mockResolvedValue(true) };
    mutations = { findTarget: jest.fn().mockResolvedValue(customTarget) };
    catalog = {
      search: jest.fn(),
      findVisibleById: jest.fn().mockResolvedValue(foodDetail),
      listCategories: jest.fn().mockResolvedValue([category]),
      listNutrients: jest.fn().mockResolvedValue(nutrientDefinitions),
    };
    unitOfWork = {
      create: jest.fn().mockResolvedValue(foodDetail.id),
      update: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('creates a valid custom food with nutrients and a serving', async () => {
    const useCase = new CreateCustomFoodUseCase(access, catalog, unitOfWork);

    const result = await useCase.execute(validCreateCommand);

    expect(result).toEqual(foodDetail);
    expect(unitOfWork.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        householdId: 'household-id',
        createdById: 'user-id',
        name: 'Pan casero',
        source: 'USER',
        nutrients: validCreateCommand.nutrients,
        servings: validCreateCommand.servings,
      }),
    );
  });

  it('rejects a negative nutrient', async () => {
    const useCase = new CreateCustomFoodUseCase(access, catalog, unitOfWork);

    await expect(
      useCase.execute({
        ...validCreateCommand,
        nutrients: [
          { nutrientDefinitionId: 'energy-id', amount: -1 },
          ...validCreateCommand.nutrients.slice(1),
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidFoodInputError);
    expect(unitOfWork.create.mock.calls).toHaveLength(0);
  });

  it('rejects a zero reference quantity', async () => {
    const useCase = new CreateCustomFoodUseCase(access, catalog, unitOfWork);

    await expect(
      useCase.execute({ ...validCreateCommand, referenceQuantity: 0 }),
    ).rejects.toBeInstanceOf(InvalidFoodInputError);
  });

  it('updates nutrients and servings when the user belongs to the household', async () => {
    const useCase = new UpdateCustomFoodUseCase(access, mutations, catalog, unitOfWork);

    await useCase.execute({
      actorId: 'user-id',
      foodId: 'food-id',
      nutrients: validCreateCommand.nutrients,
      servings: validCreateCommand.servings,
    });

    expect(unitOfWork.update.mock.calls[0]).toEqual([
      'food-id',
      {
        name: undefined,
        brand: undefined,
        description: undefined,
        categoryId: undefined,
        preparationState: undefined,
        referenceQuantity: undefined,
        referenceUnit: undefined,
        source: undefined,
        confidenceLevel: undefined,
        nutrients: validCreateCommand.nutrients,
        servings: validCreateCommand.servings,
      },
    ]);
  });

  it('prevents editing a global food', async () => {
    mutations.findTarget.mockResolvedValue({
      ...customTarget,
      householdId: null,
      foodType: 'GENERIC',
      isGlobal: true,
    });
    const useCase = new UpdateCustomFoodUseCase(access, mutations, catalog, unitOfWork);

    await expect(
      useCase.execute({ actorId: 'user-id', foodId: 'global-food', name: 'Cambio' }),
    ).rejects.toBeInstanceOf(FoodModificationNotAllowedError);
  });

  it('prevents editing a food from another household', async () => {
    access.isActiveMember.mockResolvedValue(false);
    const useCase = new UpdateCustomFoodUseCase(access, mutations, catalog, unitOfWork);

    await expect(
      useCase.execute({ actorId: 'user-id', foodId: 'food-id', name: 'Cambio' }),
    ).rejects.toBeInstanceOf(FoodHouseholdAccessDeniedError);
  });

  it('soft deletes an authorized custom food', async () => {
    const useCase = new DeleteCustomFoodUseCase(access, mutations, unitOfWork);

    await useCase.execute('user-id', 'food-id');

    const deletedAt = unitOfWork.softDelete.mock.calls[0]?.[1];
    expect(unitOfWork.softDelete.mock.calls[0]?.[0]).toBe('food-id');
    expect(deletedAt).toBeInstanceOf(Date);
  });

  it('allows household commercial foods to use the existing update and soft-delete flow', async () => {
    mutations.findTarget.mockResolvedValue({ ...customTarget, foodType: 'COMMERCIAL' });
    const update = new UpdateCustomFoodUseCase(access, mutations, catalog, unitOfWork);
    const remove = new DeleteCustomFoodUseCase(access, mutations, unitOfWork);

    await update.execute({ actorId: 'user-id', foodId: 'food-id', name: 'Updated label' });
    await remove.execute('user-id', 'food-id');

    expect(unitOfWork.update).toHaveBeenCalledWith(
      'food-id',
      expect.objectContaining({ name: 'Updated label' }),
    );
    expect(unitOfWork.softDelete).toHaveBeenCalledWith('food-id', expect.any(Date));
  });
});

const category = {
  id: 'category-id',
  code: 'BREAD',
  name: 'Panes',
  displayOrder: 1,
};

const nutrientDefinitions: NutrientDefinitionView[] = [
  {
    id: 'energy-id',
    code: 'ENERGY_KCAL',
    name: 'Energía',
    unit: 'kcal',
    group: 'ENERGY',
    displayOrder: 1,
    isRequired: true,
  },
  {
    id: 'protein-id',
    code: 'PROTEIN',
    name: 'Proteína',
    unit: 'g',
    group: 'MACRONUTRIENT',
    displayOrder: 2,
    isRequired: true,
  },
];

const validCreateCommand = {
  actorId: 'user-id',
  householdId: 'household-id',
  name: ' Pan casero ',
  categoryId: 'category-id',
  preparationState: 'READY_TO_EAT' as const,
  referenceQuantity: 100,
  referenceUnit: 'GRAM' as const,
  confidenceLevel: 'USER_PROVIDED' as const,
  nutrients: [
    { nutrientDefinitionId: 'energy-id', amount: 250 },
    { nutrientDefinitionId: 'protein-id', amount: 8 },
  ],
  servings: [
    {
      name: '1 rebanada',
      quantity: 1,
      unit: 'unidad',
      equivalentGrams: 30,
    },
  ],
};

const customTarget = {
  id: 'food-id',
  householdId: 'household-id',
  foodType: 'CUSTOM' as const,
  isGlobal: false,
  isActive: true,
  deletedAt: null,
};

const foodDetail: FoodDetailView = {
  id: 'food-id',
  householdId: 'household-id',
  name: 'Pan casero',
  brand: null,
  category,
  foodType: 'CUSTOM',
  preparationState: 'READY_TO_EAT',
  referenceQuantity: 100,
  referenceUnit: 'GRAM',
  energyKcal: 250,
  proteinGrams: 8,
  carbohydrateGrams: null,
  fatGrams: null,
  description: null,
  source: 'USER',
  sourceReference: null,
  confidenceLevel: 'USER_PROVIDED',
  isGlobal: false,
  nutrients: [],
  servings: [],
  aliases: [],
};
