import Decimal from 'decimal.js';
import { Purchase } from '../../domain/entities/purchase';
import {
  PurchaseOcrMetadata,
  PurchaseProps,
  PurchaseItemProps,
} from '../../domain/models/purchase.models';

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
  source?: PurchaseProps['source'];
  currency: string;
  total: { toString(): string };
  idempotencyKey?: string | null;
  ocrProvider?: string | null;
  ocrSchemaVersion?: string | null;
  ocrPayload?: unknown;
  ocrConfidence?: { toString(): string } | null;
  ocrWarnings?: unknown;
  ocrRequiresReview?: boolean | null;
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
      source: record.source ?? 'MANUAL',
      currency: record.currency,
      total: new Decimal(record.total.toString()),
      idempotencyKey: record.idempotencyKey ?? null,
      ocrMetadata: readOcrMetadata(record),
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
      source: props.source,
      currency: props.currency,
      total: props.total.toString(),
      idempotencyKey: props.idempotencyKey,
      ocrProvider: props.ocrMetadata?.provider ?? null,
      ocrSchemaVersion: props.ocrMetadata?.schemaVersion ?? null,
      ocrPayload: props.ocrMetadata?.payload ?? null,
      ocrConfidence: props.ocrMetadata?.confidence ?? null,
      ocrWarnings: props.ocrMetadata?.warnings ?? null,
      ocrRequiresReview: props.ocrMetadata?.requiresReview ?? null,
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

function readOcrMetadata(record: PurchaseRecord): PurchaseOcrMetadata | null {
  if (
    !record.ocrProvider ||
    !record.ocrSchemaVersion ||
    !record.ocrPayload ||
    typeof record.ocrPayload !== 'object' ||
    Array.isArray(record.ocrPayload) ||
    !Array.isArray(record.ocrWarnings) ||
    typeof record.ocrRequiresReview !== 'boolean'
  ) {
    return null;
  }

  return {
    provider: record.ocrProvider,
    schemaVersion: record.ocrSchemaVersion,
    payload: record.ocrPayload as Record<string, unknown>,
    confidence: record.ocrConfidence ? Number(record.ocrConfidence.toString()) : null,
    warnings: record.ocrWarnings.filter((value): value is string => typeof value === 'string'),
    requiresReview: record.ocrRequiresReview,
  };
}
