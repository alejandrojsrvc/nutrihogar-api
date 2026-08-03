import type {
  InventoryItemType,
  InventoryItemStatus,
  InventoryUnit,
  InventoryMovementType,
} from '../../../inventory/domain/models/inventory.models';
import type { PurchaseStatus } from '../../../purchases/domain/models/purchase.models';

export const OPERATIONAL_REPORT_REPOSITORY = Symbol('OperationalReportRepository');

export interface ReportPeriod {
  from: Date;
  to: Date;
}

export interface ReportInventoryItem {
  id: string;
  foodId: string | null;
  name: string;
  itemType: InventoryItemType;
  currentQuantity: string;
  unit: InventoryUnit;
  minimumQuantity: string | null;
  expiresAt: Date | null;
  status: InventoryItemStatus;
  movements: ReportInventoryMovement[];
}

export interface ReportInventoryMovement {
  itemId: string;
  foodId?: string | null;
  type: InventoryMovementType;
  quantity: string;
  unit: InventoryUnit;
  occurredAt: Date;
  reason: string | null;
}

export interface ReportPurchase {
  id: string;
  storeName: string;
  purchaseDate: Date;
  status: PurchaseStatus;
  currency: string;
  total: string;
  items: Array<{ foodId: string | null; name: string; unit: string; quantity: string }>;
}

export interface ReportPreparedLeftover {
  name: string;
  weight: string;
  status: 'AVAILABLE' | 'CONSUMED' | 'DISCARDED' | 'EXPIRED';
  storedAt: Date;
  updatedAt: Date;
}

export interface OperationalReportRepository {
  listInventoryItems(householdId: string, period: ReportPeriod): Promise<ReportInventoryItem[]>;
  listPurchases(householdId: string, period: ReportPeriod): Promise<ReportPurchase[]>;
  listPreparedLeftovers(
    householdId: string,
    period: ReportPeriod,
  ): Promise<ReportPreparedLeftover[]>;
}
