import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { FoodDetailView } from '../src/food-catalog/application/models/food-catalog.models';
import {
  FOOD_CATALOG_MUTATION_REPOSITORY,
  FOOD_CATALOG_UNIT_OF_WORK,
  FOOD_HOUSEHOLD_ACCESS_REPOSITORY,
  FoodCatalogMutationRepository,
  FoodCatalogUnitOfWork,
  FoodHouseholdAccessRepository,
} from '../src/food-catalog/application/ports/food-catalog-mutation.port';
import {
  FOOD_CATALOG_READ_REPOSITORY,
  FoodCatalogReadRepository,
} from '../src/food-catalog/application/ports/food-catalog-read-repository.port';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';

describe('Food catalog HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const foods: jest.Mocked<FoodCatalogReadRepository> = {
    search: jest.fn(),
    findVisibleById: jest.fn(),
    listCategories: jest.fn(),
    listNutrients: jest.fn(),
  };
  const access: jest.Mocked<FoodHouseholdAccessRepository> = {
    isActiveMember: jest.fn(),
  };
  const mutations: jest.Mocked<FoodCatalogMutationRepository> = {
    findTarget: jest.fn(),
  };
  const unitOfWork: jest.Mocked<FoodCatalogUnitOfWork> = {
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(FOOD_CATALOG_READ_REPOSITORY)
      .useValue(foods)
      .overrideProvider(FOOD_HOUSEHOLD_ACCESS_REPOSITORY)
      .useValue(access)
      .overrideProvider(FOOD_CATALOG_MUTATION_REPOSITORY)
      .useValue(mutations)
      .overrideProvider(FOOD_CATALOG_UNIT_OF_WORK)
      .useValue(unitOfWork)
      .compile();
    app = module.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.execute.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      displayName: null,
      avatarUrl: null,
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
    });
    access.isActiveMember.mockResolvedValue(true);
    mutations.findTarget.mockResolvedValue({
      id: foodId,
      householdId,
      foodType: 'CUSTOM',
      isGlobal: false,
      isActive: true,
      deletedAt: null,
    });
    foods.listCategories.mockResolvedValue([category]);
    foods.listNutrients.mockResolvedValue(nutrientDefinitions);
    foods.findVisibleById.mockResolvedValue(foodDetail);
    unitOfWork.create.mockResolvedValue(foodId);
    unitOfWork.update.mockResolvedValue(undefined);
    unitOfWork.softDelete.mockResolvedValue(undefined);
  });

  it('searches foods with filters and pagination', async () => {
    foods.search.mockResolvedValue({ items: [], page: 2, limit: 10, total: 0 });

    await request(app.getHttpServer())
      .get('/api/foods?query=pollo&preparationState=COOKED&page=2&limit=10')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect({ items: [], pagination: { page: 2, limit: 10, total: 0 } });

    expect(foods.search.mock.calls[0]?.[0]).toEqual({
      actorId: 'user-id',
      query: 'pollo',
      categoryId: undefined,
      preparationState: 'COOKED',
      foodType: undefined,
      page: 2,
      limit: 10,
    });
  });

  it('does not expose an invisible household food', async () => {
    foods.findVisibleById.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/api/foods/other-household-food')
      .set('Authorization', 'Bearer valid-token')
      .expect(404);
  });

  it('lists categories and nutrient definitions', async () => {
    foods.listCategories.mockResolvedValue([
      { id: 'category-id', code: 'POULTRY', name: 'Aves', displayOrder: 1 },
    ]);
    foods.listNutrients.mockResolvedValue([
      {
        id: 'nutrient-id',
        code: 'PROTEIN',
        name: 'Proteína',
        unit: 'g',
        group: 'MACRONUTRIENT',
        displayOrder: 1,
        isRequired: true,
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/food-categories')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/nutrients')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
  });

  it('creates a valid custom food for an active household member', async () => {
    await request(app.getHttpServer())
      .post(`/api/households/${householdId}/foods`)
      .set('Authorization', 'Bearer valid-token')
      .send(validFoodRequest)
      .expect(201);

    expect(unitOfWork.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        householdId,
        createdById: 'user-id',
        name: 'Pan casero',
        nutrients: validFoodRequest.nutrients,
      }),
    );
  });

  it('rejects a negative nutrient and a zero reference quantity', async () => {
    await request(app.getHttpServer())
      .post(`/api/households/${householdId}/foods`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        ...validFoodRequest,
        nutrients: [{ ...validFoodRequest.nutrients[0], amount: -1 }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/households/${householdId}/foods`)
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validFoodRequest, referenceQuantity: 0 })
      .expect(400);
  });

  it('edits an authorized custom food', async () => {
    await request(app.getHttpServer())
      .patch(`/api/foods/${foodId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Pan actualizado' })
      .expect(200);

    expect(unitOfWork.update.mock.calls[0]).toEqual([
      foodId,
      expect.objectContaining({ name: 'Pan actualizado' }),
    ]);
  });

  it('prevents editing a global food', async () => {
    mutations.findTarget.mockResolvedValue({
      id: foodId,
      householdId: null,
      foodType: 'GENERIC',
      isGlobal: true,
      isActive: true,
      deletedAt: null,
    });

    await request(app.getHttpServer())
      .patch(`/api/foods/${foodId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Cambio inválido' })
      .expect(403);
  });

  it('prevents editing a custom food from another household', async () => {
    access.isActiveMember.mockResolvedValue(false);

    await request(app.getHttpServer())
      .patch(`/api/foods/${foodId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Cambio inválido' })
      .expect(403);
  });

  it('soft deletes an authorized custom food', async () => {
    await request(app.getHttpServer())
      .delete(`/api/foods/${foodId}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(204);

    expect(unitOfWork.softDelete.mock.calls[0]?.[0]).toBe(foodId);
    expect(unitOfWork.softDelete.mock.calls[0]?.[1]).toBeInstanceOf(Date);
  });
});

const householdId = '11111111-1111-4111-8111-111111111111';
const foodId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const energyId = '44444444-4444-4444-8444-444444444444';

const category = {
  id: categoryId,
  code: 'BREAD',
  name: 'Panes',
  displayOrder: 1,
};

const nutrientDefinitions = [
  {
    id: energyId,
    code: 'ENERGY_KCAL',
    name: 'Energía',
    unit: 'kcal',
    group: 'ENERGY',
    displayOrder: 1,
    isRequired: true,
  },
];

const validFoodRequest = {
  name: 'Pan casero',
  categoryId,
  preparationState: 'READY_TO_EAT',
  referenceQuantity: 100,
  referenceUnit: 'GRAM',
  confidenceLevel: 'USER_PROVIDED',
  nutrients: [{ nutrientDefinitionId: energyId, amount: 250 }],
  servings: [
    {
      name: '1 rebanada',
      quantity: 1,
      unit: 'unidad',
      equivalentGrams: 30,
    },
  ],
};

const foodDetail: FoodDetailView = {
  id: foodId,
  householdId,
  name: 'Pan casero',
  brand: null,
  category,
  foodType: 'CUSTOM',
  preparationState: 'READY_TO_EAT',
  referenceQuantity: 100,
  referenceUnit: 'GRAM',
  energyKcal: 250,
  proteinGrams: null,
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
