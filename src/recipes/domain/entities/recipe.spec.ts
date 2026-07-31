import Decimal from 'decimal.js';
import {
  DuplicateRecipeIngredientError,
  RecipeArchivedError,
  RecipeIngredientsRequiredError,
  RecipeNameRequiredError,
} from '../errors/recipe.errors';
import { Recipe } from './recipe';

describe('Recipe aggregate', () => {
  it('creates a recipe with ordered ingredients and instructions', () => {
    const recipe = Recipe.create({
      ...base,
      ingredients: [ingredient('food-2', 2), ingredient('food-1', 1)],
      instructions: [instruction('step-2', 2), instruction('step-1', 1)],
    });

    expect(recipe.ingredients.map(({ foodId, position }) => ({ foodId, position }))).toEqual([
      { foodId: 'food-1', position: 1 },
      { foodId: 'food-2', position: 2 },
    ]);
    expect(recipe.instructions.map(({ id, position }) => ({ id, position }))).toEqual([
      { id: 'step-1', position: 1 },
      { id: 'step-2', position: 2 },
    ]);
  });

  it('rejects missing name, ingredients and duplicate ingredients', () => {
    expect(() => Recipe.create({ ...base, name: ' ' })).toThrow(RecipeNameRequiredError);
    expect(() => Recipe.create({ ...base, ingredients: [] })).toThrow(
      RecipeIngredientsRequiredError,
    );
    expect(() =>
      Recipe.create({ ...base, ingredients: [ingredient('food-1', 1), ingredient('food-1', 2)] }),
    ).toThrow(DuplicateRecipeIngredientError);
  });

  it('edits, removes and reorders ingredients', () => {
    const recipe = Recipe.create({
      ...base,
      ingredients: [ingredient('food-1', 1), ingredient('food-2', 2)],
    });
    recipe.updateIngredient('ingredient-1', { ...ingredient('food-3', 1), id: 'ingredient-1' });
    recipe.reorderIngredients(['ingredient-2', 'ingredient-1']);
    recipe.removeIngredient('ingredient-2');

    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.ingredients[0]).toMatchObject({ foodId: 'food-3', position: 1 });
  });

  it('allows instruction changes and archive', () => {
    const recipe = Recipe.create({ ...base, ingredients: [ingredient('food-1', 1)] });
    recipe.addInstruction({ id: 'step-1', position: 1, description: 'Cocinar' });
    recipe.updateInstruction('step-1', { position: 1, description: 'Cocinar y servir' });
    recipe.archive();

    expect(recipe.status).toBe('ARCHIVED');
    expect(() => recipe.rename('Otra')).toThrow(RecipeArchivedError);
  });

  it('does not allow removing the last ingredient', () => {
    const recipe = Recipe.create({ ...base, ingredients: [ingredient('food-1', 1)] });

    expect(() => recipe.removeIngredient('ingredient-1')).toThrow(RecipeIngredientsRequiredError);
  });
});

const base = {
  id: 'recipe-id',
  householdId: 'household-id',
  createdById: 'user-id',
  name: 'Arroz con pollo',
  description: null,
  category: 'LUNCH',
  defaultServings: 4,
  estimatedPreparationMinutes: 60,
  instructions: [],
  tags: [],
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
};

function ingredient(foodId: string, position: number) {
  return {
    id: `ingredient-${position}`,
    foodId,
    quantity: new Decimal(100),
    unit: 'GRAM' as const,
    servingId: null,
    position,
    notes: null,
  };
}

function instruction(id: string, position: number) {
  return { id, position, description: `Descripción ${position}` };
}
