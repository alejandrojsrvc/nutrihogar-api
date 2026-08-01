import { Purchase } from '../../domain/entities/purchase';
import { InventoryUnit } from '../../../inventory/domain/models/inventory.models';

export const PURCHASE_INVENTORY_UNIT_OF_WORK = Symbol('PurchaseInventoryUnitOfWork');

export interface PurchaseConfirmationItem {
  purchaseItemId: string;
  foodId: string | null;
  inventoryItemId: string | null;
  name: string;
  quantity: string;
  unit: InventoryUnit;
  sourceShoppingItemId: string | null;
}

export interface PurchaseInventoryUnitOfWork {
  confirm(input: {
    purchase: Purchase;
    items: PurchaseConfirmationItem[];
    actorId: string;
    occurredAt: Date;
  }): Promise<Purchase>;
}
