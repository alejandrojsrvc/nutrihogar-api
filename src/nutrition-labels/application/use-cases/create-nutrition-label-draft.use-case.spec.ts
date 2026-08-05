/* eslint-disable @typescript-eslint/unbound-method */
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { ObjectStorage } from '../../../storage/application/ports/object-storage.port';
import { NutritionLabelExtractionPort } from '../ports/nutrition-label-extraction.port';
import { NutritionLabelDraftRepository } from '../ports/nutrition-label-draft.repository';
import { StructuredNutritionLabelExtraction } from '../../domain/models/nutrition-label-draft';
import { CreateNutritionLabelDraftUseCase } from './create-nutrition-label-draft.use-case';

describe('CreateNutritionLabelDraftUseCase', () => {
  const now = new Date('2026-08-04T12:00:00Z');
  const access = {
    household: { id: 'house', name: 'Home', timezone: 'UTC', currency: 'USD' },
    role: 'MEMBER',
    status: 'ACTIVE',
  } as const;
  const file = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(300)]);
  const extraction: StructuredNutritionLabelExtraction = {
    schema_version: 'nutrition-label.v1',
    product_name: 'Bread',
    brand: 'Brand',
    net_content: { value: 500, unit: 'g' },
    serving_size: { description: '1 slice', value: 50, unit: 'g' },
    servings_per_container: 10,
    nutrition_declarations: [
      {
        basis: { type: 'PER_SERVING', value: 50, unit: 'g' },
        nutrients: {
          energy_kcal: 120,
          protein_g: 5,
          total_fat_g: 2,
          saturated_fat_g: null,
          trans_fat_g: null,
          carbohydrates_g: 20,
          sugars_g: null,
          fiber_g: null,
          sodium_mg: null,
        },
      },
    ],
    ingredients: [],
    allergens: { contains: [], may_contain: [] },
    warnings: [],
    confidence: 0.8,
    requires_review: false,
  };

  it('persists Gemini structured data and always deletes the temporary object', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue(access),
    } as unknown as HouseholdRepository;
    const drafts = {
      findUnexpiredByHash: jest.fn().mockResolvedValue(null),
      saveReplacingExpired: jest.fn().mockImplementation((value) =>
        Promise.resolve({
          id: 'draft',
          status: 'PENDING_REVIEW',
          confirmedAt: null,
          confirmedFoodId: null,
          createdAt: now,
          updatedAt: now,
          ...value,
        }),
      ),
    } as unknown as NutritionLabelDraftRepository;
    const extractionPort = {
      extract: jest.fn().mockResolvedValue(extraction),
    } as unknown as NutritionLabelExtractionPort;
    const storage = {
      upload: jest
        .fn()
        .mockResolvedValue({ key: 'temporary', size: file.length, contentType: 'image/jpeg' }),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as ObjectStorage;
    const useCase = new CreateNutritionLabelDraftUseCase(
      households,
      drafts,
      extractionPort,
      storage,
      1024,
      () => now,
    );

    const result = await useCase.execute({
      actorId: 'user',
      householdId: 'house',
      content: file,
      fileName: 'label.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.extractedData).toMatchObject({
      schema_version: 'nutrition-label.v1',
      product_name: 'Bread',
      nutrition_declarations: extraction.nutrition_declarations,
      requires_review: false,
    });
    expect(storage.delete).toHaveBeenCalledWith('temporary');
    expect(drafts.saveReplacingExpired).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bread',
        packageQuantity: '500',
        packageUnit: 'GRAM',
        rawText: JSON.stringify(extraction),
      }),
    );
  });

  it('returns an unexpired hash match without uploading or invoking extraction', async () => {
    const existing = { id: 'existing' };
    const households = {
      findAccess: jest.fn().mockResolvedValue(access),
    } as unknown as HouseholdRepository;
    const drafts = {
      findUnexpiredByHash: jest.fn().mockResolvedValue(existing),
    } as unknown as NutritionLabelDraftRepository;
    const extractionPort = { extract: jest.fn() } as unknown as NutritionLabelExtractionPort;
    const storage = { upload: jest.fn() } as unknown as ObjectStorage;
    const useCase = new CreateNutritionLabelDraftUseCase(
      households,
      drafts,
      extractionPort,
      storage,
      1024,
      () => now,
    );

    await expect(
      useCase.execute({
        actorId: 'user',
        householdId: 'house',
        content: file,
        fileName: 'label.jpg',
        contentType: 'image/jpeg',
      }),
    ).resolves.toBe(existing);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(extractionPort.extract).not.toHaveBeenCalled();
  });

  it('deletes the temporary object when structured extraction fails', async () => {
    const households = {
      findAccess: jest.fn().mockResolvedValue(access),
    } as unknown as HouseholdRepository;
    const drafts = {
      findUnexpiredByHash: jest.fn().mockResolvedValue(null),
    } as unknown as NutritionLabelDraftRepository;
    const extractionPort = {
      extract: jest.fn().mockRejectedValue(new Error('provider failed')),
    } as unknown as NutritionLabelExtractionPort;
    const storage = {
      upload: jest
        .fn()
        .mockResolvedValue({ key: 'temporary', size: file.length, contentType: 'image/jpeg' }),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as ObjectStorage;
    const useCase = new CreateNutritionLabelDraftUseCase(
      households,
      drafts,
      extractionPort,
      storage,
      1024,
      () => now,
    );

    await expect(
      useCase.execute({
        actorId: 'user',
        householdId: 'house',
        content: file,
        fileName: 'label.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow('provider failed');
    expect(storage.delete).toHaveBeenCalledWith('temporary');
  });
});
