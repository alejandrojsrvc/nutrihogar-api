import Decimal from 'decimal.js';

export type PurchaseStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type PurchaseSource = 'MANUAL' | 'SHOPPING_LIST' | 'OCR';
export type PurchaseUnit = 'GRAM' | 'MILLILITER' | 'UNIT' | 'KG' | 'G' | 'L' | 'ML' | 'EA';

export interface PurchaseItemProps {
  id: string;
  foodId: string | null;
  inventoryItemId: string | null;
  sourceShoppingItemId: string | null;
  nameSnapshot: string;
  unit: string;
  quantity: Decimal;
}

export interface PurchaseProps {
  id: string;
  householdId: string;
  registeredById: string;
  storeName: string;
  purchaseDate: Date;
  status: PurchaseStatus;
  source: PurchaseSource;
  currency: string;
  total: Decimal;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseItemProps[];
}

export interface CreatePurchaseItemInput {
  id: string;
  foodId?: string | null;
  inventoryItemId?: string | null;
  sourceShoppingItemId?: string | null;
  nameSnapshot: string;
  unit: string;
  quantity: Decimal.Value;
}

export interface CreatePurchaseInput {
  id: string;
  householdId: string;
  registeredById: string;
  storeName: string;
  purchaseDate: Date;
  currency: string;
  total: Decimal.Value;
  idempotencyKey?: string | null;
  source?: PurchaseSource;
  items: CreatePurchaseItemInput[];
  createdAt: Date;
}
