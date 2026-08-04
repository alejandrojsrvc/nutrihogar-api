import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { CurrentUser } from '../src/identity/application/models/current-user';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { ARCHIVE_RECIPE_USE_CASE } from '../src/recipes/application/use-cases/archive-recipe.use-case';
import { CALCULATE_RECIPE_NUTRITION_USE_CASE } from '../src/recipes/application/use-cases/calculate-recipe-nutrition.use-case';
import { CREATE_RECIPE_USE_CASE } from '../src/recipes/application/use-cases/create-recipe.use-case';
import { GET_RECIPE_USE_CASE } from '../src/recipes/application/use-cases/get-recipe.use-case';
import { LIST_RECIPES_USE_CASE } from '../src/recipes/application/use-cases/list-recipes.use-case';
import { UPDATE_RECIPE_USE_CASE } from '../src/recipes/application/use-cases/update-recipe.use-case';
import { IMPORT_RECIPE_USE_CASE } from '../src/recipes/application/use-cases/import-recipe.use-case';
import { Recipe } from '../src/recipes/domain/entities/recipe';

describe('Recipes HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const createRecipe = { execute: jest.fn() };
  const updateRecipe = { execute: jest.fn() };
  const getRecipe = { execute: jest.fn() };
  const listRecipes = { execute: jest.fn() };
  const archiveRecipe = { execute: jest.fn() };
  const calculateRecipeNutrition = { execute: jest.fn() };
  const importRecipe = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(CREATE_RECIPE_USE_CASE)
      .useValue(createRecipe)
      .overrideProvider(UPDATE_RECIPE_USE_CASE)
      .useValue(updateRecipe)
      .overrideProvider(GET_RECIPE_USE_CASE)
      .useValue(getRecipe)
      .overrideProvider(LIST_RECIPES_USE_CASE)
      .useValue(listRecipes)
      .overrideProvider(ARCHIVE_RECIPE_USE_CASE)
      .useValue(archiveRecipe)
      .overrideProvider(CALCULATE_RECIPE_NUTRITION_USE_CASE)
      .useValue(calculateRecipeNutrition)
      .overrideProvider(IMPORT_RECIPE_USE_CASE)
      .useValue(importRecipe)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    getCurrentUser.execute.mockReset().mockResolvedValue(currentUser);
    createRecipe.execute.mockReset().mockResolvedValue(recipe);
    updateRecipe.execute.mockReset().mockResolvedValue(recipe);
    getRecipe.execute.mockReset().mockResolvedValue(recipe);
    listRecipes.execute
      .mockReset()
      .mockResolvedValue({ items: [recipe], page: 1, limit: 20, total: 1 });
    archiveRecipe.execute.mockReset().mockResolvedValue(undefined);
    calculateRecipeNutrition.execute.mockReset().mockResolvedValue(recipeNutrition);
    importRecipe.execute.mockReset().mockResolvedValue(importedRecipe);
  });

  it('creates, lists, updates and archives recipes', async () => {
    await request(app.getHttpServer())
      .post('/api/households/household-id/recipes')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: 'Arroz con pollo',
        defaultServings: 4,
        ingredients: [
          {
            foodId: '00000000-0000-4000-8000-000000000001',
            quantity: 600,
            unit: 'GRAM',
            position: 1,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/households/household-id/recipes?query=arroz')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) => expect(response.body).toHaveProperty('items'));

    await request(app.getHttpServer())
      .get('/api/recipes/recipe-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) => expect(response.body).toHaveProperty('name', 'Arroz con pollo'));

    await request(app.getHttpServer())
      .get('/api/recipes/recipe-id/nutrition')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('totalNutrients.ENERGY_KCAL', 800);
        expect(response.body).toHaveProperty('perServingNutrients.ENERGY_KCAL', 200);
      });

    await request(app.getHttpServer())
      .patch('/api/recipes/recipe-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Arroz familiar' })
      .expect(200);

    await request(app.getHttpServer())
      .delete('/api/recipes/recipe-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);
  });

  it('imports a global recipe as an editable household copy', async () => {
    await request(app.getHttpServer())
      .post('/api/households/household-id/recipes/import')
      .set('Authorization', 'Bearer valid-token')
      .send({ recipeId: '00000000-0000-4000-8000-000000000001' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('name', 'Arroz con pollo');
        expect(response.body).toHaveProperty('isGlobal', false);
      });
    expect(importRecipe.execute).toHaveBeenCalledWith({
      actorId: 'user-id',
      householdId: 'household-id',
      recipeId: '00000000-0000-4000-8000-000000000001',
    });
  });
});

const currentUser: CurrentUser = {
  id: 'user-id',
  email: 'usuario@example.com',
  displayName: 'Alejandro',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

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
      id: 'ingredient-id',
      foodId: 'food-id',
      quantity: 600,
      unit: 'GRAM',
      servingId: null,
      position: 1,
      notes: null,
    },
  ],
  instructions: [],
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
});

const importedRecipe = Recipe.create({
  id: 'imported-recipe-id',
  householdId: 'household-id',
  createdById: 'user-id',
  name: 'Arroz con pollo',
  description: null,
  category: 'LUNCH',
  defaultServings: 4,
  estimatedPreparationMinutes: 60,
  tags: ['imported'],
  ingredients: [
    {
      id: 'imported-ingredient-id',
      foodId: 'food-id',
      quantity: 600,
      unit: 'GRAM',
      servingId: null,
      position: 1,
      notes: null,
    },
  ],
  instructions: [],
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
});

const recipeNutrition = {
  recipeId: 'recipe-id',
  servings: 4,
  ingredients: [
    {
      ingredientId: 'ingredient-id',
      foodId: 'food-id',
      baseQuantity: { toDecimalPlaces: () => ({ toNumber: () => 600 }) },
      baseUnit: 'GRAM' as const,
      nutrients: { ENERGY_KCAL: { toDecimalPlaces: () => ({ toNumber: () => 800 }) } },
    },
  ],
  totalNutrients: { ENERGY_KCAL: { toDecimalPlaces: () => ({ toNumber: () => 800 }) } },
  perServingNutrients: { ENERGY_KCAL: { toDecimalPlaces: () => ({ toNumber: () => 200 }) } },
  warnings: [],
};
