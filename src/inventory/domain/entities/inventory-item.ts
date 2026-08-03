import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import {
  ArchivedInventoryItemError,
  DuplicateInventoryOperationError,
  InsufficientInventoryError,
  InvalidInventoryItemError,
  InvalidInventoryQuantityError,
  InventoryMovementInvariantError,
} from '../errors/inventory.errors';
import {
  CreateInventoryItemInput,
  InventoryItemProps,
  InventoryMovementMetadata,
  InventoryMovementType,
} from '../models/inventory.models';
import { InventoryQuantity } from '../value-objects/inventory-quantity';
import { InventoryMovement } from './inventory-movement';

export class InventoryItem {
  private readonly movementHistory: InventoryMovement[];
  private pending: InventoryMovement[];
  private persistedVersion: number;

  private constructor(
    private readonly props: InventoryItemProps,
    movements: InventoryMovement[],
    pending: InventoryMovement[],
    persistedVersion: number,
    private newItem: boolean,
  ) {
    this.movementHistory = [...movements];
    this.pending = [...pending];
    this.persistedVersion = persistedVersion;
  }

  static create(input: CreateInventoryItemInput): InventoryItem {
    validateSource(input);
    const quantity = InventoryQuantity.from(input.initialQuantity).toDecimal();
    const minimumQuantity = normalizeMinimum(input.minimumQuantity ?? null);
    const createdAt = new Date(input.createdAt);
    const props: InventoryItemProps = {
      id: input.id,
      householdId: input.householdId,
      foodId: input.foodId ?? null,
      preparedFoodLeftoverId: input.preparedFoodLeftoverId ?? null,
      nameSnapshot: normalizeRequired(input.nameSnapshot),
      itemType: input.itemType,
      currentQuantity: quantity,
      unit: input.unit,
      minimumQuantity,
      location: input.location?.trim() || null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      status: quantity.isZero() ? 'DEPLETED' : 'ACTIVE',
      version: 0,
      createdAt,
      updatedAt: createdAt,
    };
    const movement = createMovement(
      props,
      input.initialMovement.type ?? 'MANUAL_ENTRY',
      quantity,
      input.initialMovement,
    );
    return new InventoryItem(props, [], [movement], 0, true);
  }

  static reconstitute(props: InventoryItemProps, movements: InventoryMovement[]): InventoryItem {
    validateSource(props);
    const normalized = copyItemProps(props);
    InventoryQuantity.from(normalized.currentQuantity);
    normalizeMinimum(normalized.minimumQuantity);
    if (!Number.isInteger(props.version) || props.version < 0)
      throw new InvalidInventoryItemError();
    if (
      props.status !== 'ARCHIVED' &&
      ((normalized.currentQuantity.isZero() && props.status !== 'DEPLETED') ||
        (normalized.currentQuantity.gt(0) && props.status !== 'ACTIVE'))
    ) {
      throw new InventoryMovementInvariantError();
    }
    const sum = movements.reduce((total, movement) => total.add(movement.quantity), new Decimal(0));
    if (!sum.eq(normalized.currentQuantity)) throw new InventoryMovementInvariantError();
    if (
      movements.some(
        (movement) =>
          movement.itemId !== props.id ||
          movement.toProps().unit !== props.unit ||
          !hasValidSign(movement),
      )
    ) {
      throw new InventoryMovementInvariantError();
    }
    ensureUniqueOperations(movements);
    return new InventoryItem(normalized, [...movements], [], props.version, false);
  }

  get id(): string {
    return this.props.id;
  }
  get householdId(): string {
    return this.props.householdId;
  }
  get foodId(): string | null {
    return this.props.foodId;
  }
  get preparedFoodLeftoverId(): string | null {
    return this.props.preparedFoodLeftoverId;
  }
  get nameSnapshot(): string {
    return this.props.nameSnapshot;
  }
  get itemType() {
    return this.props.itemType;
  }
  get currentQuantity(): Decimal {
    return new Decimal(this.props.currentQuantity);
  }
  get unit() {
    return this.props.unit;
  }
  get minimumQuantity(): Decimal | null {
    return this.props.minimumQuantity === null ? null : new Decimal(this.props.minimumQuantity);
  }
  get location(): string | null {
    return this.props.location;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt ? new Date(this.props.expiresAt) : null;
  }
  get status() {
    return this.props.status;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.props.updatedAt);
  }
  get expectedVersion(): number {
    return this.persistedVersion;
  }
  get isNew(): boolean {
    return this.newItem;
  }
  get movements(): readonly InventoryMovement[] {
    return Object.freeze([...this.movementHistory, ...this.pending]);
  }
  get pendingMovements(): readonly InventoryMovement[] {
    return Object.freeze([...this.pending]);
  }

  registerPurchase(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyEntry('PURCHASE', quantity, metadata);
  }

  increase(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyEntry('ADJUSTMENT_INCREASE', quantity, metadata);
  }

  consume(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyExit('CONSUMPTION', quantity, metadata);
  }

  decrease(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyExit('ADJUSTMENT_DECREASE', quantity, metadata);
  }

  registerWaste(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyExit('WASTE', quantity, metadata);
  }

  registerExpiration(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyExit('EXPIRATION', quantity, metadata);
  }

  registerPreparationConsumption(
    quantity: Decimal.Value,
    metadata: InventoryMovementMetadata,
  ): void {
    this.applyExit('PREPARATION_CONSUMPTION', quantity, metadata);
  }

  returnRemainder(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.applyEntry('REMAINDER_RETURN', quantity, metadata);
  }

  adjustTo(quantity: Decimal.Value, metadata: InventoryMovementMetadata): void {
    this.ensureMovementAllowed(metadata.syncOperationId ?? null);
    const target = InventoryQuantity.from(quantity).toDecimal();
    const difference = target.sub(this.props.currentQuantity);
    if (difference.isZero()) return;
    this.applyMovement(
      difference.isPositive() ? 'ADJUSTMENT_INCREASE' : 'ADJUSTMENT_DECREASE',
      difference,
      metadata,
    );
  }

  markDepleted(changedAt = new Date()): void {
    if (!this.props.currentQuantity.isZero()) throw new InvalidInventoryQuantityError();
    if (this.props.status === 'ARCHIVED') throw new ArchivedInventoryItemError();
    if (this.props.status !== 'DEPLETED') this.touch('DEPLETED', changedAt);
  }

  archive(changedAt = new Date()): void {
    if (this.props.status !== 'ARCHIVED') this.touch('ARCHIVED', changedAt);
  }

  updateMetadata(
    input: {
      minimumQuantity?: Decimal.Value | null;
      location?: string | null;
      expiresAt?: Date | null;
    },
    changedAt = new Date(),
  ): void {
    if (this.props.status === 'ARCHIVED') throw new ArchivedInventoryItemError();
    if (input.minimumQuantity !== undefined) {
      this.props.minimumQuantity = normalizeMinimum(input.minimumQuantity);
    }
    if (input.location !== undefined) this.props.location = input.location?.trim() || null;
    if (input.expiresAt !== undefined) {
      this.props.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }
    this.props.updatedAt = new Date(changedAt);
    this.props.version += 1;
  }

  toProps(): InventoryItemProps {
    return copyItemProps(this.props);
  }

  markPersisted(version: number): void {
    this.movementHistory.push(...this.pending);
    this.pending = [];
    this.props.version = version;
    this.persistedVersion = version;
    this.newItem = false;
  }

  private applyEntry(
    type: Extract<InventoryMovementType, 'PURCHASE' | 'ADJUSTMENT_INCREASE' | 'REMAINDER_RETURN'>,
    quantity: Decimal.Value,
    metadata: InventoryMovementMetadata,
  ): void {
    const amount = positive(quantity);
    this.applyMovement(type, amount, metadata);
  }

  private applyExit(
    type: Extract<
      InventoryMovementType,
      'CONSUMPTION' | 'ADJUSTMENT_DECREASE' | 'WASTE' | 'EXPIRATION' | 'PREPARATION_CONSUMPTION'
    >,
    quantity: Decimal.Value,
    metadata: InventoryMovementMetadata,
  ): void {
    const amount = positive(quantity);
    if (amount.gt(this.props.currentQuantity)) throw new InsufficientInventoryError();
    this.applyMovement(type, amount.negated(), metadata);
  }

  private applyMovement(
    type: InventoryMovementType,
    signedQuantity: Decimal,
    metadata: InventoryMovementMetadata,
  ): void {
    this.ensureMovementAllowed(metadata.syncOperationId ?? null);
    const next = this.props.currentQuantity.add(signedQuantity);
    if (next.isNegative()) throw new InsufficientInventoryError();
    this.pending.push(createMovement(this.props, type, signedQuantity, metadata));
    this.props.currentQuantity = next;
    this.props.status = next.isZero() ? 'DEPLETED' : 'ACTIVE';
    this.props.updatedAt = new Date(metadata.occurredAt);
    this.props.version += 1;
  }

  private ensureMovementAllowed(syncOperationId: string | null): void {
    if (this.props.status === 'ARCHIVED') throw new ArchivedInventoryItemError();
    if (
      syncOperationId &&
      this.movements.some((movement) => movement.syncOperationId === syncOperationId)
    ) {
      throw new DuplicateInventoryOperationError();
    }
  }

  private touch(status: InventoryItemProps['status'], changedAt: Date): void {
    this.props.status = status;
    this.props.updatedAt = new Date(changedAt);
    this.props.version += 1;
  }
}

function createMovement(
  item: InventoryItemProps,
  type: InventoryMovementType,
  quantity: Decimal,
  metadata: InventoryMovementMetadata,
): InventoryMovement {
  return InventoryMovement.create({
    id: metadata.id ?? crypto.randomUUID(),
    itemId: item.id,
    type,
    quantity,
    unit: item.unit,
    occurredAt: new Date(metadata.occurredAt),
    sourceType: metadata.sourceType ?? null,
    sourceId: metadata.sourceId ?? null,
    reason: metadata.reason?.trim() || null,
    actorId: metadata.actorId ?? null,
    deviceId: metadata.deviceId ?? null,
    syncOperationId: metadata.syncOperationId ?? null,
    createdAt: new Date(metadata.createdAt ?? metadata.occurredAt),
  });
}

function positive(value: Decimal.Value): Decimal {
  const amount = InventoryQuantity.from(value).toDecimal();
  if (amount.isZero()) throw new InvalidInventoryQuantityError();
  return amount;
}

function normalizeMinimum(value: Decimal.Value | null): Decimal | null {
  return value === null ? null : InventoryQuantity.from(value).toDecimal();
}

function validateSource(
  input: Pick<InventoryItemProps, 'itemType' | 'foodId' | 'preparedFoodLeftoverId'>,
): void {
  const valid =
    (input.itemType === 'FOOD' && !!input.foodId && !input.preparedFoodLeftoverId) ||
    (input.itemType === 'PREPARED_FOOD' && !input.foodId && !!input.preparedFoodLeftoverId) ||
    (input.itemType === 'CUSTOM' && !input.foodId && !input.preparedFoodLeftoverId);
  if (!valid) throw new InvalidInventoryItemError('Inventory source does not match item type');
}

function normalizeRequired(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidInventoryItemError();
  return normalized;
}

function ensureUniqueOperations(movements: InventoryMovement[]): void {
  const ids = movements.map((movement) => movement.syncOperationId).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new DuplicateInventoryOperationError();
}

function hasValidSign(movement: InventoryMovement): boolean {
  const { type, quantity } = movement.toProps();
  if (type === 'MANUAL_ENTRY') return quantity.gte(0);
  if (['PURCHASE', 'ADJUSTMENT_INCREASE', 'REMAINDER_RETURN'].includes(type)) {
    return quantity.gt(0);
  }
  return quantity.lt(0);
}

function copyItemProps(props: InventoryItemProps): InventoryItemProps {
  return {
    ...props,
    currentQuantity: new Decimal(props.currentQuantity),
    minimumQuantity: props.minimumQuantity === null ? null : new Decimal(props.minimumQuantity),
    expiresAt: props.expiresAt ? new Date(props.expiresAt) : null,
    createdAt: new Date(props.createdAt),
    updatedAt: new Date(props.updatedAt),
  };
}
