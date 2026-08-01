import Decimal from 'decimal.js';
import { InvalidPurchaseError } from '../errors/purchase.errors';
import { CreatePurchaseItemInput, PurchaseItemProps } from '../models/purchase.models';

export class PurchaseItem {
  private constructor(private readonly props: PurchaseItemProps) {}

  static create(input: CreatePurchaseItemInput): PurchaseItem {
    return new PurchaseItem(normalizeProps(input));
  }

  static reconstitute(props: PurchaseItemProps): PurchaseItem {
    return new PurchaseItem(normalizeProps(props));
  }

  get id(): string {
    return this.props.id;
  }
  get foodId(): string | null {
    return this.props.foodId;
  }
  get inventoryItemId(): string | null {
    return this.props.inventoryItemId;
  }
  get sourceShoppingItemId(): string | null {
    return this.props.sourceShoppingItemId;
  }
  get nameSnapshot(): string {
    return this.props.nameSnapshot;
  }
  get unit(): string {
    return this.props.unit;
  }
  get quantity(): Decimal {
    return new Decimal(this.props.quantity);
  }

  toProps(): PurchaseItemProps {
    return { ...this.props, quantity: new Decimal(this.props.quantity) };
  }
}

function normalizeProps(input: CreatePurchaseItemInput | PurchaseItemProps): PurchaseItemProps {
  const nameSnapshot = input.nameSnapshot.trim();
  const unit = input.unit.trim();
  if (!input.id.trim() || !nameSnapshot || !unit)
    throw new InvalidPurchaseError('Purchase item id, name and unit are required.');
  let quantity: Decimal;
  try {
    quantity = new Decimal(input.quantity);
  } catch {
    throw new InvalidPurchaseError('Purchase item quantity must be a finite decimal.');
  }
  if (!quantity.isFinite() || quantity.lte(0))
    throw new InvalidPurchaseError('Purchase item quantity must be positive.');
  return {
    id: input.id.trim(),
    foodId: input.foodId?.trim() || null,
    inventoryItemId: input.inventoryItemId?.trim() || null,
    sourceShoppingItemId: input.sourceShoppingItemId?.trim() || null,
    nameSnapshot,
    unit,
    quantity,
  };
}
