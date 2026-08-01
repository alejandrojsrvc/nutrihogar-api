import Decimal from 'decimal.js';
import { Purchase } from '../../domain/entities/purchase';
import { PurchaseProps, PurchaseItemProps } from '../../domain/models/purchase.models';

export interface PurchaseItemRecord {
  id: string;
  purchaseId: string;
  foodId: string | null;
  inventoryItemId: string | null;
  sourceShoppingItemId: string | null;
  nameSnapshot: string;
  unit: string;
  quantity: { toString(): string };
}

export interface PurchaseRecord {
  id: string;
  householdId: string;
  registeredById: string;
  storeName: string;
  purchaseDate: Date;
  status: PurchaseProps['status'];
  currency: string;
  total: { toString(): string };
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseItemRecord[];
}

export class PrismaPurchaseMapper {
  static toDomain(record: PurchaseRecord): Purchase {
    return Purchase.reconstitute({
      id: record.id,
      householdId: record.householdId,
      registeredById: record.registeredById,
      storeName: record.storeName,
      purchaseDate: record.purchaseDate,
      status: record.status,
      currency: record.currency,
      total: new Decimal(record.total.toString()),
      idempotencyKey: record.idempotencyKey ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      items: record.items.map((item): PurchaseItemProps => ({
        id: item.id,
        foodId: item.foodId,
        inventoryItemId: item.inventoryItemId,
        sourceShoppingItemId: item.sourceShoppingItemId,
        nameSnapshot: item.nameSnapshot,
        unit: item.unit,
        quantity: new Decimal(item.quantity.toString()),
      })),
    });
  }

  static toPersistence(purchase: Purchase) {
    const props = purchase.toProps();
    return {
      id: props.id,
      householdId: props.householdId,
      registeredById: props.registeredById,
      storeName: props.storeName,
      purchaseDate: props.purchaseDate,
      status: props.status,
      currency: props.currency,
      total: props.total.toString(),
      idempotencyKey: props.idempotencyKey,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      items: props.items.map((item) => ({
        id: item.id,
        purchaseId: props.id,
        foodId: item.foodId,
        inventoryItemId: item.inventoryItemId,
        sourceShoppingItemId: item.sourceShoppingItemId,
        nameSnapshot: item.nameSnapshot,
        unit: item.unit,
        quantity: item.quantity.toString(),
      })),
    };
  }
}
