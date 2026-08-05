/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { FoodCatalogReadRepository } from '../../../food-catalog/application/ports/food-catalog-read-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import {
  NutritionLabelAdminRequiredError,
  NutritionLabelDraftAlreadyConfirmedError,
} from '../errors/nutrition-label.errors';
import { NutritionLabelConfirmationPort } from '../ports/nutrition-label-confirmation.port';
import { NutritionLabelDraftRepository } from '../ports/nutrition-label-draft.repository';
import {
  ConfirmNutritionLabelDraftCommand,
  ConfirmNutritionLabelDraftUseCase,
} from './confirm-nutrition-label-draft.use-case';

describe('ConfirmNutritionLabelDraftUseCase', () => {
  const now = new Date('2026-08-04T12:00:00Z');
  const command: ConfirmNutritionLabelDraftCommand = {
    actorId: 'user',
    householdId: 'house',
    draftId: 'draft',
    name: 'Bread',
    categoryId: 'category',
    preparationState: 'READY_TO_EAT',
    packageQuantity: '500',
    packageUnit: 'GRAM',
    basisQuantity: '50',
    basisUnit: 'GRAM',
    nutrients: [
      { code: 'ENERGY_KCAL', amount: '120' },
      { code: 'PROTEIN', amount: '5' },
      { code: 'CARBOHYDRATE', amount: '20' },
      { code: 'FAT', amount: '2.5' },
    ],
    serving: { name: 'slice', quantity: '1', unit: 'slice', equivalentGrams: '50' },
  };
  const draft = {
    id: 'draft',
    householdId: 'house',
    createdById: 'user',
    documentHash: 'hash',
    status: 'PENDING_REVIEW',
    name: null,
    brand: null,
    packageQuantity: null,
    packageUnit: null,
    extractedData: {
      schema_version: 'nutrition-label.v1',
      product_name: null,
      brand: null,
      net_content: { value: null, unit: null },
      serving_size: { description: null, value: null, unit: null },
      servings_per_container: null,
      nutrition_declarations: [],
      ingredients: [],
      allergens: { contains: [], may_contain: [] },
      warnings: [],
      confidence: null,
      requires_review: true,
    },
    warnings: [],
    missingFields: [],
    rawText: '',
    confidence: null,
    expiresAt: new Date('2026-08-05T12:00:00Z'),
    confirmedAt: null,
    confirmedFoodId: null,
    createdAt: now,
    updatedAt: now,
  } as const;

  it('requires active ADMIN access before reading or confirming the draft', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' }),
    } as unknown as HouseholdRepository;
    const drafts = { findById: jest.fn() } as unknown as NutritionLabelDraftRepository;
    const useCase = new ConfirmNutritionLabelDraftUseCase(
      households,
      drafts,
      {} as FoodCatalogReadRepository,
      {} as NutritionLabelConfirmationPort,
      () => now,
    );
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(NutritionLabelAdminRequiredError);
    expect(drafts.findById).not.toHaveBeenCalled();
  });

  it('normalizes a 50 g declaration to 100 g and keeps package quantity out of the calculation', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE' }),
    } as unknown as HouseholdRepository;
    const drafts = {
      findById: jest.fn().mockResolvedValue(draft),
    } as unknown as NutritionLabelDraftRepository;
    const catalog = {
      listCategories: jest.fn().mockResolvedValue([{ id: 'category' }]),
      listNutrients: jest
        .fn()
        .mockResolvedValue(command.nutrients.map((value) => ({ code: value.code }))),
    } as unknown as FoodCatalogReadRepository;
    const transaction = {
      confirm: jest
        .fn()
        .mockResolvedValue({ food: { id: 'food' }, inventory: { id: 'inventory' } }),
    } as unknown as NutritionLabelConfirmationPort;
    const useCase = new ConfirmNutritionLabelDraftUseCase(
      households,
      drafts,
      catalog,
      transaction,
      () => now,
    );

    await useCase.execute(command);

    expect(transaction.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        packageQuantity: '500',
        nutrients: expect.arrayContaining([
          { code: 'PROTEIN', normalizedAmount: '10' },
          { code: 'FAT', normalizedAmount: '5' },
        ]),
      }),
    );
  });

  it('rejects a draft that was already confirmed without invoking the transaction', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE' }),
    } as unknown as HouseholdRepository;
    const drafts = {
      findById: jest.fn().mockResolvedValue({ ...draft, status: 'CONFIRMED' }),
    } as unknown as NutritionLabelDraftRepository;
    const transaction = { confirm: jest.fn() } as unknown as NutritionLabelConfirmationPort;
    const useCase = new ConfirmNutritionLabelDraftUseCase(
      households,
      drafts,
      {} as FoodCatalogReadRepository,
      transaction,
      () => now,
    );
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      NutritionLabelDraftAlreadyConfirmedError,
    );
    expect(transaction.confirm).not.toHaveBeenCalled();
  });

  it('forwards an authorized target food for the atomic update path', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE' }),
    } as unknown as HouseholdRepository;
    const drafts = {
      findById: jest.fn().mockResolvedValue(draft),
    } as unknown as NutritionLabelDraftRepository;
    const catalog = {
      listCategories: jest.fn().mockResolvedValue([{ id: 'category' }]),
      listNutrients: jest
        .fn()
        .mockResolvedValue(command.nutrients.map((value) => ({ code: value.code }))),
    } as unknown as FoodCatalogReadRepository;
    const transaction = {
      confirm: jest
        .fn()
        .mockResolvedValue({ food: { id: 'food' }, inventory: { id: 'inventory' } }),
    } as unknown as NutritionLabelConfirmationPort;
    const useCase = new ConfirmNutritionLabelDraftUseCase(
      households,
      drafts,
      catalog,
      transaction,
      () => now,
    );

    await useCase.execute({ ...command, targetFoodId: 'existing-food' });

    expect(transaction.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ targetFoodId: 'existing-food' }),
    );
  });
});
