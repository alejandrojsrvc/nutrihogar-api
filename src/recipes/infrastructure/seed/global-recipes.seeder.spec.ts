import { GLOBAL_RECIPES } from './global-recipes.seeder';

describe('Global recipe seed definitions', () => {
  it('contains the requested global catalog', () => {
    expect(GLOBAL_RECIPES).toHaveLength(11);
    expect(GLOBAL_RECIPES.map((recipe) => recipe.name)).toEqual([
      'Arepa con huevos revueltos',
      'Arepa con jamon y queso',
      'Arroz con ensalada y bistec',
      'Arroz con pollo',
      'Milanesa con pure de papa',
      'Pollo al horno con papa',
      'Ensalada de lechuga, tomate y aguacate',
      'Guiso de carne molida con arroz',
      'Yogur con banana',
      'Huevos revueltos con pan',
      'Tostadas de palta con huevo',
    ]);
  });

  it('uses stable food source references and keeps names unique', () => {
    const names = new Set<string>();
    for (const recipe of GLOBAL_RECIPES) {
      expect(recipe.ingredients.every(({ sourceReference }) => sourceReference.length > 0)).toBe(
        true,
      );
      expect(recipe.defaultServings).toBeGreaterThan(0);
      expect(names.has(recipe.name)).toBe(false);
      names.add(recipe.name);
    }
  });

  it('declares a serving name for every serving-based ingredient', () => {
    for (const recipe of GLOBAL_RECIPES) {
      for (const ingredient of recipe.ingredients) {
        if (ingredient.unit === 'SERVING') {
          expect(ingredient.servingName).toBeTruthy();
        }
      }
    }
  });
});
