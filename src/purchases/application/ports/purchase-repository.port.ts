import { Purchase } from '../../domain/entities/purchase';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { PurchaseStatus } from '../../domain/models/purchase.models';
import { HouseholdId } from '../../domain/value-objects/household-id';

export const PURCHASE_REPOSITORY = Symbol('PurchaseRepository');

export interface PurchaseFilters {
  status?: PurchaseStatus;
  from?: Date;
  to?: Date;
  storeName?: string;
  page: number;
  limit: number;
}

export interface PaginatedPurchases {
  items: Purchase[];
  page: number;
  limit: number;
  total: number;
}

export interface PurchaseRepository {
  findById(id: PurchaseId): Promise<Purchase | null>;
  save(purchase: Purchase): Promise<void>;
  listByHousehold(householdId: HouseholdId, filters: PurchaseFilters): Promise<PaginatedPurchases>;
  findByIdempotencyKey?(householdId: string, key: string): Promise<Purchase | null>;
}
