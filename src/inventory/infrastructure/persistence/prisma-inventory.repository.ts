/* eslint-disable @typescript-eslint/unbound-method */

import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  InventoryFilters,
  InventoryItemRepository,
  InventoryMovementRepository,
  InventorySourceCompatibility,
  InventorySourceReference,
  MovementFilters,
  PaginatedInventoryItems,
  PaginatedInventoryMovements,
  PreparationInventoryUnitOfWork,
  PreparedInventoryConsumptionUnitOfWork,
  PreparedBatchInventoryDecision,
} from '../../application/ports/inventory-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import {
  DuplicateInventoryOperationError,
  InvalidInventoryItemError,
  InventoryVersionConflictError,
} from '../../domain/errors/inventory.errors';
import { PrismaInventoryItemMapper } from './prisma-inventory-item.mapper';
import { PrismaInventoryMovementMapper } from './prisma-inventory-movement.mapper';
import { InventoryItemRecord, InventoryMovementRecord } from './prisma-inventory.types';
import { CreateMealInput } from '../../../meal-tracking/application/ports/meal-repository.port';
import { MealView } from '../../../meal-tracking/domain/models/meal.models';
import { PrismaMealMapper } from '../../../meal-tracking/infrastructure/persistence/prisma-meal.mapper';
import type { MealRecord } from '../../../meal-tracking/infrastructure/persistence/prisma-meal.mapper';
import { mealInclude } from '../../../meal-tracking/infrastructure/persistence/prisma-meal.repository';

const movements = { orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] };

interface InventoryDelegate {
  fields: { minimumQuantity: unknown };
  findUnique(args: unknown): Promise<InventoryItemRecord | null>;
  findFirst(args: unknown): Promise<InventoryItemRecord | null>;
  findMany(args: unknown): Promise<InventoryItemRecord[]>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<{ count: number }>;
}

interface MovementDelegate {
  findUnique(args: unknown): Promise<{ id: string } | null>;
  findMany(args: unknown): Promise<InventoryMovementRecord[]>;
  count(args: unknown): Promise<number>;
  createMany(args: unknown): Promise<unknown>;
}

interface InventoryClient {
  inventoryItem: InventoryDelegate;
  inventoryMovement: MovementDelegate;
  meal: { create(args: unknown): Promise<MealRecord> };
}

@Injectable()
export class PrismaInventoryRepository
  implements
    InventoryItemRepository,
    InventoryMovementRepository,
    PreparationInventoryUnitOfWork,
    PreparedInventoryConsumptionUnitOfWork
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<InventoryItem | null> {
    const record = await this.client(this.prisma).inventoryItem.findUnique({
      where: { id },
      include: { movements },
    });
    return record ? PrismaInventoryItemMapper.toDomain(record) : null;
  }

  async findBySource(
    householdId: string,
    source: InventorySourceReference,
    compatibility?: InventorySourceCompatibility,
  ): Promise<InventoryItem | null> {
    const record = await this.client(this.prisma).inventoryItem.findFirst({
      where: {
        householdId,
        status: { not: 'ARCHIVED' },
        ...(source.foodId ? { foodId: source.foodId } : {}),
        ...(source.preparedFoodLeftoverId
          ? { preparedFoodLeftoverId: source.preparedFoodLeftoverId }
          : {}),
        ...(compatibility
          ? {
              unit: compatibility.unit,
              location: compatibility.location,
              expiresAt: compatibility.expiresAt,
            }
          : {}),
      },
      include: { movements },
    });
    return record ? PrismaInventoryItemMapper.toDomain(record) : null;
  }

  async findCandidates(
    householdId: string,
    foodId: string,
    unit: InventorySourceCompatibility['unit'],
  ): Promise<InventoryItem[]> {
    const records = await this.client(this.prisma).inventoryItem.findMany({
      where: { householdId, foodId, unit, status: { in: ['ACTIVE', 'DEPLETED'] } },
      include: { movements },
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }, { id: 'asc' }],
    });
    return records.map(PrismaInventoryItemMapper.toDomain);
  }

  async hasPreparedBatchConsumption(batchId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM preparation_inventory_consumptions WHERE prepared_batch_id = ${batchId} LIMIT 1`;
    return rows.length > 0;
  }

  async confirmPreparedBatchConsumption(input: {
    householdId: string;
    batchId: string;
    actorId: string;
    decisions: PreparedBatchInventoryDecision[];
    occurredAt: Date;
  }): Promise<InventoryItem[]> {
    return this.prisma.$transaction(async (transaction) => {
      try {
        await transaction.$executeRaw`INSERT INTO preparation_inventory_consumptions (id, prepared_batch_id, household_id, actor_id, created_at) VALUES (gen_random_uuid(), ${input.batchId}, ${input.householdId}, ${input.actorId}, ${input.occurredAt})`;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new DuplicateInventoryOperationError();
        }
        throw error;
      }
      const result: InventoryItem[] = [];
      for (const decision of input.decisions) {
        if (decision.action === 'IGNORE') continue;
        const record = await this.client(transaction).inventoryItem.findUnique({
          where: { id: decision.inventoryItemId },
          include: { movements },
        });
        if (
          !record ||
          record.householdId !== input.householdId ||
          record.foodId === null ||
          record.unit !== decision.unit
        )
          throw new InvalidInventoryItemError('Inventory candidate is not compatible.');
        const item = PrismaInventoryItemMapper.toDomain(record);
        item.registerPreparationConsumption(decision.quantity, {
          type: 'PREPARATION_CONSUMPTION',
          occurredAt: input.occurredAt,
          actorId: input.actorId,
          sourceType: 'PREPARED_BATCH',
          sourceId: input.batchId,
          reason: `Ingredient ${decision.ingredientId}`,
        });
        await this.saveWithClient(transaction, item);
        result.push(item);
      }
      return result;
    });
  }

  async addPreparedLeftover(input: {
    householdId: string;
    leftoverId: string;
    batchId: string;
    name: string;
    quantity: string;
    location: string | null;
    minimumQuantity: string | null;
    expiresAt: Date | null;
    actorId: string;
    occurredAt: Date;
  }): Promise<InventoryItem> {
    const item = InventoryItem.create({
      id: crypto.randomUUID(),
      householdId: input.householdId,
      foodId: null,
      preparedFoodLeftoverId: input.leftoverId,
      nameSnapshot: input.name,
      itemType: 'PREPARED_FOOD',
      initialQuantity: input.quantity,
      unit: 'GRAM',
      minimumQuantity: input.minimumQuantity,
      location: input.location,
      expiresAt: input.expiresAt,
      createdAt: input.occurredAt,
      initialMovement: {
        type: 'REMAINDER_RETURN',
        occurredAt: input.occurredAt,
        actorId: input.actorId,
        sourceType: 'PREPARED_BATCH',
        sourceId: input.batchId,
        reason: 'Prepared food leftover returned to inventory',
      },
    });
    try {
      await this.save(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new DuplicateInventoryOperationError();
      throw error;
    }
    return item;
  }

  async consume(input: {
    item: InventoryItem;
    meal: CreateMealInput;
  }): Promise<{ item: InventoryItem; meal: MealView }> {
    const meal = await this.prisma.$transaction(async (transaction) => {
      const created = await this.client(transaction).meal.create({
        data: {
          householdId: input.meal.householdId,
          adultProfileId: input.meal.adultProfileId,
          mealType: input.meal.mealType,
          consumedAt: input.meal.consumedAt,
          notes: input.meal.notes,
          createdById: input.meal.createdById,
          source: input.meal.source,
          items: { create: input.meal.items.map(toMealItemCreateData) },
        },
        include: mealInclude,
      });
      await this.saveWithClient(transaction, input.item);
      return created;
    });
    return { item: input.item, meal: PrismaMealMapper.toView(meal) };
  }

  async save(item: InventoryItem): Promise<void> {
    const data = PrismaInventoryItemMapper.toPersistence(item);
    try {
      await this.prisma.$transaction(async (transaction) => this.saveWithClient(transaction, item));
      item.markPersisted(data.version);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        String(error.meta?.target).includes('sync_operation_id')
      ) {
        throw new DuplicateInventoryOperationError();
      }
      throw error;
    }
  }

  private async saveWithClient(transaction: unknown, item: InventoryItem): Promise<void> {
    const data = PrismaInventoryItemMapper.toPersistence(item);
    const client = this.client(transaction);
    if (item.isNew) {
      await client.inventoryItem.create({
        data: {
          id: data.id,
          householdId: data.householdId,
          foodId: data.foodId,
          preparedFoodLeftoverId: data.preparedFoodLeftoverId,
          nameSnapshot: data.nameSnapshot,
          itemType: data.itemType,
          currentQuantity: data.currentQuantity,
          unit: data.unit,
          minimumQuantity: data.minimumQuantity,
          location: data.location,
          expiresAt: data.expiresAt,
          status: data.status,
          version: data.version,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          movements: { create: data.movements },
        },
      });
      item.markPersisted(data.version);
      return;
    }

    const updated = await client.inventoryItem.updateMany({
      where: { id: data.id, householdId: data.householdId, version: item.expectedVersion },
      data: {
        currentQuantity: data.currentQuantity,
        minimumQuantity: data.minimumQuantity,
        location: data.location,
        expiresAt: data.expiresAt,
        status: data.status,
        version: data.version,
        updatedAt: data.updatedAt,
      },
    });
    if (updated.count === 0) throw new InventoryVersionConflictError();
    if (data.movements.length > 0) {
      await client.inventoryMovement.createMany({ data: data.movements });
    }
    item.markPersisted(data.version);
  }

  async listByHousehold(
    householdId: string,
    filters: InventoryFilters,
  ): Promise<PaginatedInventoryItems> {
    const where = {
      householdId,
      ...(filters.query
        ? { nameSnapshot: { contains: filters.query.trim(), mode: 'insensitive' } }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.itemType ? { itemType: filters.itemType } : {}),
      ...(filters.foodId ? { foodId: filters.foodId } : {}),
      ...(filters.location
        ? { location: { equals: filters.location.trim(), mode: 'insensitive' } }
        : {}),
      ...(filters.belowMinimum
        ? {
            minimumQuantity: { not: null },
            currentQuantity: {
              lte: this.client(this.prisma).inventoryItem.fields.minimumQuantity,
            },
          }
        : {}),
      ...(filters.expiresBefore ? { expiresAt: { lte: filters.expiresBefore } } : {}),
    };
    const client = this.client(this.prisma);
    const [records, total] = await Promise.all([
      client.inventoryItem.findMany({
        where,
        include: { movements },
        orderBy: [{ expiresAt: 'asc' }, { nameSnapshot: 'asc' }, { id: 'asc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      client.inventoryItem.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaInventoryItemMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  async existsBySyncOperationId(syncOperationId: string): Promise<boolean> {
    const record = await this.client(this.prisma).inventoryMovement.findUnique({
      where: { syncOperationId },
      select: { id: true },
    });
    return record !== null;
  }

  async listByItem(
    inventoryItemId: string,
    filters: MovementFilters,
  ): Promise<PaginatedInventoryMovements> {
    const where = {
      itemId: inventoryItemId,
      ...(filters.type ? { type: filters.type } : {}),
    };
    const client = this.client(this.prisma);
    const [records, total] = await Promise.all([
      client.inventoryMovement.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      client.inventoryMovement.count({ where }),
    ]);
    return {
      items: records.map((record) => PrismaInventoryMovementMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }

  private client(value: unknown): InventoryClient {
    return value as InventoryClient;
  }
}

function toMealItemCreateData(item: CreateMealInput['items'][number]) {
  return {
    foodId: item.foodId,
    foodServingId: item.foodServingId,
    nameSnapshot: item.nameSnapshot,
    brandSnapshot: item.brandSnapshot,
    preparationStateSnapshot: item.preparationStateSnapshot,
    quantity: item.quantity.toString(),
    unit: item.unit,
    baseQuantity: item.baseQuantity.toString(),
    baseUnit: item.baseUnit,
    measurementMethod: item.measurementMethod,
    confidenceLevel: item.confidenceLevel,
    nutrientSnapshots: {
      create: item.nutrients.map((nutrient) => ({
        nutrientCode: nutrient.code,
        nutrientName: nutrient.name,
        unit: nutrient.unit,
        amount: nutrient.amount.toString(),
      })),
    },
  };
}
