import Decimal from 'decimal.js';
import {
  InvalidInventoryMovementError,
  InvalidInventoryQuantityError,
} from '../errors/inventory.errors';
import { InventoryMovementProps } from '../models/inventory.models';

export class InventoryMovement {
  private constructor(private readonly props: InventoryMovementProps) {
    Object.freeze(this.props);
    Object.freeze(this);
  }

  static create(props: InventoryMovementProps): InventoryMovement {
    let quantity: Decimal;
    try {
      quantity = new Decimal(props.quantity);
    } catch {
      throw new InvalidInventoryQuantityError();
    }
    if (!quantity.isFinite()) throw new InvalidInventoryQuantityError();
    if (!hasValidSign(props.type, quantity)) {
      throw new InvalidInventoryMovementError('Inventory movement quantity has an invalid sign');
    }
    if (!!props.sourceType !== !!props.sourceId) {
      throw new InvalidInventoryMovementError(
        'Inventory movement source type and id must be provided together',
      );
    }
    return new InventoryMovement(copyProps({ ...props, quantity }));
  }

  get id(): string {
    return this.props.id;
  }

  get itemId(): string {
    return this.props.itemId;
  }

  get quantity(): Decimal {
    return new Decimal(this.props.quantity);
  }

  get syncOperationId(): string | null {
    return this.props.syncOperationId;
  }

  toProps(): InventoryMovementProps {
    return copyProps(this.props);
  }
}

function hasValidSign(type: InventoryMovementProps['type'], quantity: Decimal): boolean {
  if (type === 'MANUAL_ENTRY') return quantity.gte(0);
  if (['PURCHASE', 'ADJUSTMENT_INCREASE', 'REMAINDER_RETURN'].includes(type)) {
    return quantity.gt(0);
  }
  return quantity.lt(0);
}

function copyProps(props: InventoryMovementProps): InventoryMovementProps {
  return {
    ...props,
    quantity: new Decimal(props.quantity),
    occurredAt: new Date(props.occurredAt),
    createdAt: new Date(props.createdAt),
  };
}
