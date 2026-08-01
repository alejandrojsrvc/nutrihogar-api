import Decimal from 'decimal.js';

export type ShoppingListSource = 'MANUAL' | 'BELOW_MINIMUM' | 'DEPLETED' | 'MEAL_PLAN';
export type ShoppingListItemStatus = 'PENDING' | 'PURCHASED' | 'REMOVED';

export interface ShoppingListItemProps {
  id: string;
  shoppingListId: string;
  foodId: string | null;
  name: string;
  normalizedName: string;
  quantity: Decimal;
  unit: string;
  source: ShoppingListSource;
  sourceReferenceId: string | null;
  status: ShoppingListItemStatus;
  actorId: string;
  createdAt: Date;
  updatedAt: Date;
  purchasedAt: Date | null;
  purchasedById: string | null;
  removedAt: Date | null;
  removedById: string | null;
}

export interface ShoppingListProps {
  id: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
  items: ShoppingListItemProps[];
}

export interface AddShoppingListItemInput {
  id: string;
  shoppingListId: string;
  foodId?: string | null;
  name: string;
  quantity: Decimal.Value;
  unit: string;
  source: ShoppingListSource;
  sourceReferenceId?: string | null;
  actorId: string;
  occurredAt: Date;
}
