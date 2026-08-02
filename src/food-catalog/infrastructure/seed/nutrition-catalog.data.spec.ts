import { PreparationState } from '@prisma/client';
import {
  FOOD_CATEGORIES,
  NUTRIENT_DEFINITIONS,
  NUTRITION_CATALOG_FOODS,
  USDA_FDC_SOURCE_URL,
} from './nutrition-catalog.data';

describe('Initial nutrition catalog data', () => {
  it('contains stable, unique categories and nutrient definitions', () => {
    expect(FOOD_CATEGORIES).toHaveLength(12);
    expect(NUTRIENT_DEFINITIONS).toHaveLength(14);
    expect(new Set(FOOD_CATEGORIES.map(({ code }) => code)).size).toBe(12);
    expect(new Set(NUTRIENT_DEFINITIONS.map(({ code }) => code)).size).toBe(14);
    expect(USDA_FDC_SOURCE_URL).toBe('https://fdc.nal.usda.gov/');
  });

  it('contains the starter global foods without duplicated source references', () => {
    expect(NUTRITION_CATALOG_FOODS).toHaveLength(31);

    const sourceKeys = NUTRITION_CATALOG_FOODS.map(
      ({ source, sourceReference }) => `${source}:${sourceReference}`,
    );
    expect(new Set(sourceKeys).size).toBe(31);
    expect(
      NUTRITION_CATALOG_FOODS.every(
        ({ source, sourceReference, description }) =>
          (source.startsWith('USDA_FDC_') || source === 'LOCAL_SEED') &&
          sourceReference.length > 0 &&
          (source === 'LOCAL_SEED' || description.startsWith('USDA')),
      ),
    ).toBe(true);
  });

  it('provides energy and all macros for every food', () => {
    const requiredCodes = ['ENERGY_KCAL', 'PROTEIN', 'CARBOHYDRATE', 'FAT'] as const;

    for (const food of NUTRITION_CATALOG_FOODS) {
      for (const code of requiredCodes) {
        expect(food.nutrients[code]).toEqual(expect.any(Number));
        expect(food.nutrients[code]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('marks local demo foods as non-verified', () => {
    const localFoods = NUTRITION_CATALOG_FOODS.filter(({ source }) => source === 'LOCAL_SEED');

    expect(localFoods).toHaveLength(2);
    expect(localFoods.every(({ confidenceLevel }) => confidenceLevel !== 'VERIFIED')).toBe(true);
    expect(
      localFoods.every(({ sourceReference }) => sourceReference.startsWith('LOCAL_SEED:')),
    ).toBe(true);
  });

  it('keeps raw and cooked foods as separate catalog records', () => {
    const expectedPairs = [
      ['Huevo entero crudo', 'Huevo entero cocido'],
      ['Pechuga de pollo cruda', 'Pechuga de pollo cocida'],
      ['Carne vacuna magra cruda', 'Carne vacuna magra cocida'],
      ['Arroz blanco crudo', 'Arroz blanco cocido'],
      ['Yuca cruda', 'Yuca hervida'],
    ];

    for (const [rawName, cookedName] of expectedPairs) {
      const raw = NUTRITION_CATALOG_FOODS.find(({ name }) => name === rawName);
      const cooked = NUTRITION_CATALOG_FOODS.find(({ name }) => name === cookedName);

      expect(raw?.preparationState).toBe(PreparationState.RAW);
      expect(cooked?.preparationState).toBe(PreparationState.COOKED);
      expect(raw?.sourceReference).not.toBe(cooked?.sourceReference);
    }
  });

  it('contains the required gram-convertible servings', () => {
    const servings = NUTRITION_CATALOG_FOODS.flatMap(({ name, servings = [] }) =>
      servings.map((serving) => ({ foodName: name, ...serving })),
    );

    expect(servings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          foodName: 'Huevo entero crudo',
          name: 'Huevo grande',
          equivalentGrams: 50,
        }),
        expect.objectContaining({
          foodName: 'Pan de sándwich genérico',
          name: 'Rebanada',
          equivalentGrams: 25,
        }),
        expect.objectContaining({
          foodName: 'Aceite de oliva',
          name: 'Cucharada',
          equivalentGrams: 13.5,
        }),
        expect.objectContaining({
          foodName: 'Aceite de oliva',
          name: 'Cucharadita',
          equivalentGrams: 4.5,
        }),
      ]),
    );
  });
});
