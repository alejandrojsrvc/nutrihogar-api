import { STARTER_RECIPES } from './starter-recipes.seeder';

describe('Starter recipe seed definitions', () => {
  it('uses stable food source references and the requested quantities', () => {
    expect(STARTER_RECIPES).toHaveLength(4);
    expect(STARTER_RECIPES[0]).toMatchObject({
      name: 'Arepa con huevos revueltos',
      defaultServings: 1,
    });
    expect(STARTER_RECIPES[0]?.ingredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceReference: 'LOCAL_SEED:AREPA_CORN_FLOUR',
          quantity: 60,
          unit: 'GRAM',
        }),
        expect.objectContaining({
          sourceReference: '173647',
          quantity: 90,
          unit: 'MILLILITER',
        }),
        expect.objectContaining({
          sourceReference: '171287',
          quantity: 2,
          unit: 'SERVING',
          servingName: 'Huevo grande',
        }),
        expect.objectContaining({
          sourceReference: '171413',
          quantity: 1,
          unit: 'SERVING',
          servingName: '3 ml',
        }),
      ]),
    );

    for (const recipe of STARTER_RECIPES) {
      expect(recipe.ingredients.every(({ sourceReference }) => sourceReference.length > 0)).toBe(
        true,
      );
    }
  });
});
