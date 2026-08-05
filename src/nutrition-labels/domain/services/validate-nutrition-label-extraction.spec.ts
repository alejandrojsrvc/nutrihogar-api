import {
  getNutritionLabelMissingFields,
  InvalidNutritionLabelExtractionError,
  validateAndReviewNutritionLabelExtraction,
} from './validate-nutrition-label-extraction';

function response(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

describe('validateAndReviewNutritionLabelExtraction', () => {
  it('requires every contract property and accepts null values for unknown data', () => {
    const result = validateAndReviewNutritionLabelExtraction(
      response({
        nutrition_declarations: [],
        product_name: null,
        net_content: { value: null, unit: null },
        serving_size: { description: null, value: null, unit: null },
        servings_per_container: null,
        confidence: null,
      }),
    );

    expect(result.requires_review).toBe(true);
    expect(result.nutrition_declarations).toEqual([]);
    expect(getNutritionLabelMissingFields(result)).toEqual(
      expect.arrayContaining(['BASIS', 'ENERGY_KCAL', 'PROTEIN', 'CARBOHYDRATE', 'FAT']),
    );
    expect(() => validateAndReviewNutritionLabelExtraction({})).toThrow(
      InvalidNutritionLabelExtractionError,
    );
  });

  it('recomputes review for warnings, low confidence, multiple declarations, and invalid values', () => {
    const result = validateAndReviewNutritionLabelExtraction(
      response({
        warnings: ['The label is blurry.'],
        confidence: 0.4,
        nutrition_declarations: [
          response().nutrition_declarations[0],
          response().nutrition_declarations[0],
        ],
      }),
    );

    expect(result.requires_review).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'The label is blurry.',
        'Multiple nutrition declarations require human selection.',
      ]),
    );
  });

  it('sanitizes a negative nutrient to null and rejects an incompatible enum', () => {
    const result = validateAndReviewNutritionLabelExtraction(
      response({
        nutrition_declarations: [
          {
            ...response().nutrition_declarations[0],
            nutrients: { ...response().nutrition_declarations[0].nutrients, protein_g: -1 },
          },
        ],
      }),
    );
    expect(result.nutrition_declarations[0]?.nutrients.protein_g).toBeNull();
    expect(result.requires_review).toBe(true);
    expect(() =>
      validateAndReviewNutritionLabelExtraction({
        ...response(),
        nutrition_declarations: [
          {
            ...response().nutrition_declarations[0],
            basis: { type: 'UNKNOWN', value: 50, unit: 'g' },
          },
        ],
      }),
    ).toThrow(InvalidNutritionLabelExtractionError);
  });
});
