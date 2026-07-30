import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(FOOD_CATALOG_READ_REPOSITORY)
      .useValue(foods)
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
});
