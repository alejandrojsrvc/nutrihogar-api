import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { CurrentUser } from '../src/identity/application/models/current-user';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { GET_INVENTORY_ITEM_QUERY } from '../src/inventory/application/queries/get-inventory-item.query';
import { LIST_INVENTORY_ITEMS_QUERY } from '../src/inventory/application/queries/list-inventory-items.query';
import { LIST_INVENTORY_MOVEMENTS_QUERY } from '../src/inventory/application/queries/list-inventory-movements.query';
import { ADJUST_INVENTORY_ITEM_USE_CASE } from '../src/inventory/application/use-cases/adjust-inventory-item.use-case';
import { ARCHIVE_INVENTORY_ITEM_USE_CASE } from '../src/inventory/application/use-cases/archive-inventory-item.use-case';
import { CONSUME_INVENTORY_ITEM_USE_CASE } from '../src/inventory/application/use-cases/consume-inventory-item.use-case';
import { CREATE_MANUAL_INVENTORY_ITEM_USE_CASE } from '../src/inventory/application/use-cases/create-manual-inventory-item.use-case';
import { REGISTER_INVENTORY_EXPIRATION_USE_CASE } from '../src/inventory/application/use-cases/register-inventory-expiration.use-case';
import { REGISTER_INVENTORY_WASTE_USE_CASE } from '../src/inventory/application/use-cases/register-inventory-waste.use-case';
import { SET_INVENTORY_MINIMUM_USE_CASE } from '../src/inventory/application/use-cases/set-inventory-minimum.use-case';
import { InventoryItem } from '../src/inventory/domain/entities/inventory-item';
import {
  DuplicateInventorySourceError,
  InventoryAdminRequiredError,
  InventoryItemNotFoundError,
} from '../src/inventory/application/errors/inventory-application.errors';
import { InsufficientInventoryError } from '../src/inventory/domain/errors/inventory.errors';

const actorId = '00000000-0000-4000-8000-000000000001';
const householdId = '00000000-0000-4000-8000-000000000002';
const itemId = '00000000-0000-4000-8000-000000000003';
const foodId = '00000000-0000-4000-8000-000000000004';
const occurredAt = new Date('2026-07-31T12:00:00.000Z');

describe('Inventory HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const listItems = { execute: jest.fn() };
  const getItem = { execute: jest.fn() };
  const createItem = { execute: jest.fn() };
  const updateItem = { execute: jest.fn() };
  const adjustItem = { execute: jest.fn() };
  const listMovements = { execute: jest.fn() };
  const archiveItem = { execute: jest.fn() };
  const consumeItem = { execute: jest.fn() };
  const wasteItem = { execute: jest.fn() };
  const expireItem = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(LIST_INVENTORY_ITEMS_QUERY)
      .useValue(listItems)
      .overrideProvider(GET_INVENTORY_ITEM_QUERY)
      .useValue(getItem)
      .overrideProvider(CREATE_MANUAL_INVENTORY_ITEM_USE_CASE)
      .useValue(createItem)
      .overrideProvider(SET_INVENTORY_MINIMUM_USE_CASE)
      .useValue(updateItem)
      .overrideProvider(ADJUST_INVENTORY_ITEM_USE_CASE)
      .useValue(adjustItem)
      .overrideProvider(LIST_INVENTORY_MOVEMENTS_QUERY)
      .useValue(listMovements)
      .overrideProvider(ARCHIVE_INVENTORY_ITEM_USE_CASE)
      .useValue(archiveItem)
      .overrideProvider(CONSUME_INVENTORY_ITEM_USE_CASE)
      .useValue(consumeItem)
      .overrideProvider(REGISTER_INVENTORY_WASTE_USE_CASE)
      .useValue(wasteItem)
      .overrideProvider(REGISTER_INVENTORY_EXPIRATION_USE_CASE)
      .useValue(expireItem)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    const item = inventoryItem();
    getCurrentUser.execute.mockReset().mockResolvedValue(currentUser);
    listItems.execute
      .mockReset()
      .mockResolvedValue({ items: [item], page: 1, limit: 20, total: 1 });
    getItem.execute.mockReset().mockResolvedValue(item);
    createItem.execute.mockReset().mockResolvedValue(item);
    updateItem.execute.mockReset().mockResolvedValue(item);
    adjustItem.execute.mockReset().mockResolvedValue(item);
    listMovements.execute
      .mockReset()
      .mockResolvedValue({ items: [...item.movements], page: 1, limit: 20, total: 1 });
    archiveItem.execute.mockReset().mockResolvedValue(undefined);
    consumeItem.execute.mockReset().mockResolvedValue(item);
    wasteItem.execute.mockReset().mockResolvedValue(item);
    expireItem.execute.mockReset().mockResolvedValue(item);
  });

  it('exposes every inventory route and delegates authenticated commands', async () => {
    const auth = { Authorization: 'Bearer valid-token' };

    await request(app.getHttpServer())
      .get(
        `/api/households/${householdId}/inventory?query=rice&itemType=FOOD&status=ACTIVE&location=Pantry&belowMinimum=true&expiresBefore=2026-08-01T00:00:00.000Z&page=1&limit=20`,
      )
      .set(auth)
      .expect(200)
      .expect((response) => expect(response.body).toHaveProperty('items.0.currentQuantity', 5));
    expect(listItems.execute).toHaveBeenCalledWith(
      actorId,
      householdId,
      expect.objectContaining({
        query: 'rice',
        itemType: 'FOOD',
        status: 'ACTIVE',
        location: 'Pantry',
        belowMinimum: true,
        expiresBefore: new Date('2026-08-01T00:00:00.000Z'),
        page: 1,
        limit: 20,
      }),
    );

    await request(app.getHttpServer())
      .post(`/api/households/${householdId}/inventory/items`)
      .set(auth)
      .send({ foodId, quantity: 5, unit: 'GRAM' })
      .expect(201);
    await request(app.getHttpServer()).get(`/api/inventory/items/${itemId}`).set(auth).expect(200);
    await request(app.getHttpServer())
      .patch(`/api/inventory/items/${itemId}`)
      .set(auth)
      .send({ minimumQuantity: 2, location: 'Pantry' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/adjustments`)
      .set(auth)
      .send({ quantity: 4, unit: 'GRAM', reason: 'Physical count' })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/inventory/items/${itemId}/movements?page=1&limit=20`)
      .set(auth)
      .expect(200)
      .expect((response) => expect(response.body).toHaveProperty('items.0.type', 'MANUAL_ENTRY'));
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/consumptions`)
      .set(auth)
      .send({ quantity: 1, unit: 'GRAM' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/waste`)
      .set(auth)
      .send({ quantity: 1, unit: 'GRAM' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/expiration`)
      .set(auth)
      .send({ quantity: 1, unit: 'GRAM' })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/inventory/items/${itemId}`)
      .set(auth)
      .expect(204);
  });

  it('requires authentication and validates ids, units and immutable quantity', async () => {
    await request(app.getHttpServer()).get(`/api/inventory/items/${itemId}`).expect(401);
    await request(app.getHttpServer())
      .get('/api/inventory/items/not-a-uuid')
      .set('Authorization', 'Bearer valid-token')
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/consumptions`)
      .set('Authorization', 'Bearer valid-token')
      .send({ quantity: 1, unit: 'LITER' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/inventory/items/${itemId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ currentQuantity: 50 })
      .expect(400);
  });

  it('maps not found, authorization, conflict and insufficient inventory errors', async () => {
    const auth = { Authorization: 'Bearer valid-token' };
    getItem.execute.mockRejectedValueOnce(new InventoryItemNotFoundError());
    await request(app.getHttpServer()).get(`/api/inventory/items/${itemId}`).set(auth).expect(404);

    adjustItem.execute.mockRejectedValueOnce(new InventoryAdminRequiredError());
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/adjustments`)
      .set(auth)
      .send({ quantity: 2, unit: 'GRAM', reason: 'Count' })
      .expect(403);

    createItem.execute.mockRejectedValueOnce(new DuplicateInventorySourceError());
    await request(app.getHttpServer())
      .post(`/api/households/${householdId}/inventory/items`)
      .set(auth)
      .send({ foodId, quantity: 5, unit: 'GRAM' })
      .expect(409);

    consumeItem.execute.mockRejectedValueOnce(new InsufficientInventoryError());
    await request(app.getHttpServer())
      .post(`/api/inventory/items/${itemId}/consumptions`)
      .set(auth)
      .send({ quantity: 10, unit: 'GRAM' })
      .expect(409);
  });
});

const currentUser: CurrentUser = {
  id: actorId,
  email: 'user@example.com',
  displayName: 'User',
  avatarUrl: null,
  timezone: 'UTC',
  locale: 'en',
};

function inventoryItem(): InventoryItem {
  return InventoryItem.create({
    id: itemId,
    householdId,
    foodId,
    preparedFoodLeftoverId: null,
    nameSnapshot: 'Rice',
    itemType: 'FOOD',
    initialQuantity: 5,
    unit: 'GRAM',
    minimumQuantity: 2,
    location: 'Pantry',
    createdAt: occurredAt,
    initialMovement: {
      occurredAt,
      sourceType: 'MANUAL_ENTRY',
      sourceId: foodId,
      actorId,
    },
  });
}
