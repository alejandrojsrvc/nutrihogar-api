import Decimal from 'decimal.js';
import {
  InvalidShoppingListItemError,
  InvalidShoppingListItemTransitionError,
} from '../errors/shopping-list.errors';
import { ShoppingListItemProps, ShoppingListSource } from '../models/shopping-list.models';

export class ShoppingListItem {
  private constructor(private props: ShoppingListItemProps) {}

  static create(
    input: Omit<
      ShoppingListItemProps,
      | 'quantity'
      | 'normalizedName'
      | 'status'
      | 'purchasedAt'
      | 'purchasedById'
      | 'removedAt'
      | 'removedById'
      | 'updatedAt'
    > & { quantity: Decimal.Value },
  ): ShoppingListItem {
    const name = input.name.trim();
    const unit = input.unit.trim();
    const quantity = new Decimal(input.quantity);
    if (!name || !unit || !quantity.isFinite() || quantity.lte(0))
      throw new InvalidShoppingListItemError('Name, unit and quantity must be valid.');
    return new ShoppingListItem({
      ...input,
      name,
      unit,
      normalizedName: normalize(name),
      quantity,
      status: 'PENDING',
      updatedAt: input.createdAt,
      purchasedAt: null,
      purchasedById: null,
      removedAt: null,
      removedById: null,
    });
  }

  static reconstitute(props: ShoppingListItemProps): ShoppingListItem {
    return new ShoppingListItem({ ...props, quantity: new Decimal(props.quantity) });
  }

  get id() {
    return this.props.id;
  }
  get status() {
    return this.props.status;
  }
  get householdKey() {
    return this.props.shoppingListId;
  }
  get foodId() {
    return this.props.foodId;
  }
  get name() {
    return this.props.name;
  }
  get unit() {
    return this.props.unit;
  }
  get quantity() {
    return this.props.quantity;
  }
  get source() {
    return this.props.source;
  }

  isCompatible(input: { foodId?: string | null; name: string; unit: string }): boolean {
    if (this.props.status !== 'PENDING' || this.props.unit !== input.unit.trim()) return false;
    return input.foodId
      ? this.props.foodId === input.foodId
      : this.props.foodId === null && this.props.normalizedName === normalize(input.name);
  }

  combine(quantity: Decimal.Value, occurredAt: Date): void {
    this.ensurePending();
    const value = new Decimal(quantity);
    if (!value.isFinite() || value.lte(0))
      throw new InvalidShoppingListItemError('Quantity must be positive.');
    this.props.quantity = this.props.quantity.plus(value);
    this.props.updatedAt = occurredAt;
  }

  update(input: {
    name?: string;
    quantity?: Decimal.Value;
    unit?: string;
    foodId?: string | null;
    source?: ShoppingListSource;
    sourceReferenceId?: string | null;
    actorId: string;
    occurredAt: Date;
  }): void {
    this.ensurePending();
    const name = input.name === undefined ? this.props.name : input.name.trim();
    const unit = input.unit === undefined ? this.props.unit : input.unit.trim();
    const quantity =
      input.quantity === undefined ? this.props.quantity : new Decimal(input.quantity);
    if (!name || !unit || !quantity.isFinite() || quantity.lte(0))
      throw new InvalidShoppingListItemError('Name, unit and quantity must be valid.');
    this.props.name = name;
    this.props.normalizedName = normalize(name);
    this.props.unit = unit;
    this.props.quantity = quantity;
    if (input.foodId !== undefined) this.props.foodId = input.foodId;
    if (input.source !== undefined) this.props.source = input.source;
    if (input.sourceReferenceId !== undefined)
      this.props.sourceReferenceId = input.sourceReferenceId;
    this.props.actorId = input.actorId;
    this.props.updatedAt = input.occurredAt;
  }

  markPurchased(actorId: string, occurredAt: Date): void {
    this.ensurePending();
    this.props.status = 'PURCHASED';
    this.props.purchasedById = actorId;
    this.props.purchasedAt = occurredAt;
    this.props.updatedAt = occurredAt;
  }

  remove(actorId: string, occurredAt: Date): void {
    this.ensurePending();
    this.props.status = 'REMOVED';
    this.props.removedById = actorId;
    this.props.removedAt = occurredAt;
    this.props.updatedAt = occurredAt;
  }

  toProps(): ShoppingListItemProps {
    return { ...this.props, quantity: new Decimal(this.props.quantity) };
  }
  private ensurePending() {
    if (this.props.status !== 'PENDING')
      throw new InvalidShoppingListItemTransitionError('Only pending items can be changed.');
  }
}

function normalize(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}
