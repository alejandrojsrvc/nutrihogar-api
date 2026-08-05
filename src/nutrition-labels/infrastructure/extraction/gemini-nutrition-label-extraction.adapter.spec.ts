/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { NutritionLabelExtractionProcessingError } from '../../application/errors/nutrition-label.errors';
import {
  GeminiNutritionLabelExtractionAdapter,
  NUTRITION_LABEL_RESPONSE_SCHEMA,
} from './gemini-nutrition-label-extraction.adapter';

const validResponse = {
  schema_version: 'nutrition-label.v1',
  product_name: 'Food',
  brand: null,
  net_content: { value: 500, unit: 'g' },
  serving_size: { description: '1 serving', value: 50, unit: 'g' },
  servings_per_container: 10,
  nutrition_declarations: [
    {
      basis: { type: 'PER_SERVING', value: 50, unit: 'g' },
      nutrients: {
        energy_kcal: 100,
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
  confidence: 0.9,
  requires_review: false,
};

describe('GeminiNutritionLabelExtractionAdapter', () => {
  it('requests deterministic JSON structured output and validates the response', async () => {
    const client = { generateStructured: jest.fn().mockResolvedValue(validResponse) };
    const adapter = new GeminiNutritionLabelExtractionAdapter(client, {
      model: 'gemini-test',
      timeoutMs: 5000,
    });

    await expect(
      adapter.extract({ content: Buffer.from('image'), contentType: 'image/png' }),
    ).resolves.toMatchObject({
      schema_version: 'nutrition-label.v1',
      requires_review: false,
    });
    expect(client.generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-test',
        content: Buffer.from('image'),
        contentType: 'image/png',
        responseSchema: NUTRITION_LABEL_RESPONSE_SCHEMA,
      }),
    );
    const request = client.generateStructured.mock.calls[0]?.[0];
    expect(request.systemInstruction).toContain('application/json');
    expect(request.systemInstruction).toContain('temperature 0');
    expect(request.responseSchema.required).toEqual(
      expect.arrayContaining(['schema_version', 'requires_review']),
    );
  });

  it('rejects a provider response that does not match the versioned contract', async () => {
    const client = { generateStructured: jest.fn().mockResolvedValue({ schema_version: 'v0' }) };
    const adapter = new GeminiNutritionLabelExtractionAdapter(client, { model: 'gemini-test' });

    await expect(
      adapter.extract({ content: Buffer.from('image'), contentType: 'image/png' }),
    ).rejects.toBeInstanceOf(NutritionLabelExtractionProcessingError);
  });
});
