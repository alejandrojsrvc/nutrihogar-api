import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  PurchaseInventoryUnitOfWork,
  PurchaseConfirmationItem,
} from '../../application/ports/purchase-inventory-unit-of-work.port';
import { Purchase } from '../../domain/entities/purchase';
import { PrismaPurchaseMapper, PurchaseRecord } from './prisma-purchase.mapper';

interface Delegate {
  findUnique(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<{ count: number }>;
  update(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
}
interface Client {
  purchase: Delegate;
  purchaseItem: Delegate;
  inventoryItem: Delegate;
  inventoryMovement: Delegate;
  shoppingListItem: Delegate;
}
interface InventoryRecord {
  householdId: string;
  unit: string;
  currentQuantity: Prisma.Decimal;
  version: number;
}
const include = { items: { orderBy: { id: 'asc' } } };

@Injectable()
export class PrismaPurchaseInventoryUnitOfWork implements PurchaseInventoryUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async confirm(input: {
    purchase: Purchase;
    items: PurchaseConfirmationItem[];
    actorId: string;
    occurredAt: Date;
  }): Promise<Purchase> {
    return this.prisma.$transaction(async (tx) => {
      const client = this.client(tx);
      const claimed = await client.purchase.updateMany({
        where: { id: input.purchase.id, status: 'DRAFT' },
        data: { status: 'CONFIRMED', updatedAt: input.occurredAt },
      });
      if (!claimed.count) {
        const current = await client.purchase.findUnique({
          where: { id: input.purchase.id },
          include,
        });
        if (!current) throw new Error('Purchase disappeared while confirming.');
        return PrismaPurchaseMapper.toDomain(current as PurchaseRecord);
      }
      for (const item of input.items) {
        const syncOperationId = `purchase:${input.purchase.id}:item:${item.purchaseItemId}`;
        let inventoryId = item.inventoryItemId;
        if (inventoryId) {
          const record = (await client.inventoryItem.findUnique({
            where: { id: inventoryId },
            include: { movements: true },
          })) as InventoryRecord | null;
          if (
            !record ||
            record.householdId !== input.purchase.householdId ||
            record.unit !== item.unit
          )
            throw new Error('Purchase inventory candidate is invalid.');
          const nextQuantity = new Prisma.Decimal(record.currentQuantity).add(item.quantity);
          const updated = await client.inventoryItem.updateMany({
            where: { id: inventoryId, version: record.version },
            data: {
              currentQuantity: nextQuantity,
              status: 'ACTIVE',
              version: record.version + 1,
              updatedAt: input.occurredAt,
            },
          });
          if (!updated.count) throw new Error('Inventory item changed while confirming purchase.');
          await client.inventoryMovement.create({
            data: {
              id: crypto.randomUUID(),
              itemId: inventoryId,
              type: 'PURCHASE',
              quantity: item.quantity,
              unit: item.unit,
              occurredAt: input.occurredAt,
              sourceType: 'PURCHASE_ITEM',
              sourceId: item.purchaseItemId,
              reason: `Purchase ${input.purchase.id}`,
              actorId: input.actorId,
              syncOperationId,
              createdAt: input.occurredAt,
            },
          });
        } else {
          inventoryId = crypto.randomUUID();
          await client.inventoryItem.create({
            data: {
              id: inventoryId,
              householdId: input.purchase.householdId,
              foodId: item.foodId,
              nameSnapshot: item.name,
              itemType: item.foodId ? 'FOOD' : 'CUSTOM',
              currentQuantity: item.quantity,
              unit: item.unit,
              minimumQuantity: null,
              location: null,
              expiresAt: null,
              status: 'ACTIVE',
              version: 0,
              createdAt: input.occurredAt,
              updatedAt: input.occurredAt,
              movements: {
                create: {
                  id: crypto.randomUUID(),
                  type: 'PURCHASE',
                  quantity: item.quantity,
                  unit: item.unit,
                  occurredAt: input.occurredAt,
                  sourceType: 'PURCHASE_ITEM',
                  sourceId: item.purchaseItemId,
                  reason: `Purchase ${input.purchase.id}`,
                  actorId: input.actorId,
                  syncOperationId,
                  createdAt: input.occurredAt,
                },
              },
            },
          });
        }
        await client.purchaseItem.update({
          where: { id: item.purchaseItemId },
          data: { inventoryItemId: inventoryId, foodId: item.foodId },
        });
        if (item.sourceShoppingItemId) {
          const shopping = (await client.shoppingListItem.findUnique({
            where: { id: item.sourceShoppingItemId },
            include: { shoppingList: true },
          })) as { status: string; shoppingList: { householdId: string } } | null;
          if (
            !shopping ||
            shopping.shoppingList.householdId !== input.purchase.householdId ||
            shopping.status !== 'PENDING'
          )
            throw new Error('Shopping list item is not compatible.');
          const updated = await client.shoppingListItem.updateMany({
            where: { id: item.sourceShoppingItemId, status: 'PENDING' },
            data: {
              status: 'PURCHASED',
              purchasedAt: input.occurredAt,
              purchasedById: input.actorId,
              updatedAt: input.occurredAt,
            },
          });
          if (!updated.count) throw new Error('Shopping list item is no longer pending.');
        }
      }
      const current = await client.purchase.findUnique({
        where: { id: input.purchase.id },
        include,
      });
      return PrismaPurchaseMapper.toDomain(current as PurchaseRecord);
    });
  }

  private client(value: unknown): Client {
    return value as Client;
  }
}
