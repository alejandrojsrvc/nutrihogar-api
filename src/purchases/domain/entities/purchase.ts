import { InvalidPurchaseError, InvalidPurchaseStateError } from '../errors/purchase.errors';
import { PurchaseDate } from '../value-objects/purchase-date';
import { PurchaseId } from '../value-objects/purchase-id';
import { PurchaseTotal } from '../value-objects/purchase-total';
import { Currency } from '../value-objects/currency';
import { StoreName } from '../value-objects/store-name';
import {
  CreatePurchaseInput,
  CreatePurchaseItemInput,
  PurchaseProps,
  PurchaseStatus,
} from '../models/purchase.models';
import { PurchaseItem } from './purchase-item';

export class Purchase {
  private constructor(private readonly props: PurchaseProps) {}

  static create(input: CreatePurchaseInput): Purchase {
    const items = input.items.map((item) => PurchaseItem.create(item));
    if (items.length === 0)
      throw new InvalidPurchaseError('Purchase must contain at least one item.');
    ensureUniqueItems(items.map((item) => item.id));
    const createdAt = new Date(input.createdAt);
    return new Purchase({
      id: PurchaseId.from(input.id).value,
      householdId: requireId(input.householdId, 'Household id'),
      registeredById: requireId(input.registeredById, 'Registered by id'),
      storeName: StoreName.from(input.storeName).value,
      purchaseDate: PurchaseDate.from(input.purchaseDate).value,
      status: 'DRAFT',
      source: input.source ?? 'MANUAL',
      currency: Currency.from(input.currency).value,
      total: PurchaseTotal.from(input.total).toDecimal(),
      idempotencyKey: input.idempotencyKey?.trim() || null,
      createdAt,
      updatedAt: new Date(createdAt),
      items: items.map((item) => item.toProps()),
      ocrMetadata: input.ocrMetadata ? cloneOcrMetadata(input.ocrMetadata) : null,
    });
  }

  static reconstitute(props: PurchaseProps): Purchase {
    const items = props.items.map((item) => PurchaseItem.reconstitute(item));
    if (!props.id || !props.householdId || !props.registeredById)
      throw new InvalidPurchaseError('Purchase identifiers are required.');
    if (props.status === 'CONFIRMED' && items.length === 0)
      throw new InvalidPurchaseError('Confirmed purchase must contain at least one item.');
    ensureUniqueItems(items.map((item) => item.id));
    return new Purchase({
      ...props,
      id: PurchaseId.from(props.id).value,
      householdId: requireId(props.householdId, 'Household id'),
      registeredById: requireId(props.registeredById, 'Registered by id'),
      storeName: StoreName.from(props.storeName).value,
      purchaseDate: PurchaseDate.from(props.purchaseDate).value,
      currency: Currency.from(props.currency).value,
      total: PurchaseTotal.from(props.total).toDecimal(),
      idempotencyKey: props.idempotencyKey?.trim() || null,
      items: items.map((item) => item.toProps()),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      ocrMetadata: props.ocrMetadata ? cloneOcrMetadata(props.ocrMetadata) : null,
    });
  }

  get id() {
    return this.props.id;
  }
  get householdId() {
    return this.props.householdId;
  }
  get registeredById() {
    return this.props.registeredById;
  }
  get storeName() {
    return this.props.storeName;
  }
  get purchaseDate() {
    return new Date(this.props.purchaseDate);
  }
  get status(): PurchaseStatus {
    return this.props.status;
  }
  get source() {
    return this.props.source;
  }
  get currency() {
    return this.props.currency;
  }
  get total() {
    return this.props.total;
  }
  get items(): readonly PurchaseItem[] {
    return Object.freeze(this.props.items.map((item) => PurchaseItem.reconstitute(item)));
  }

  get ocrMetadata() {
    return this.props.ocrMetadata ? cloneOcrMetadata(this.props.ocrMetadata) : null;
  }

  addItem(input: CreatePurchaseItemInput, changedAt = new Date()): void {
    this.ensureDraft();
    if (this.props.items.some((item) => item.id === input.id))
      throw new InvalidPurchaseError('Purchase item id must be unique.');
    this.props.items.push(PurchaseItem.create(input).toProps());
    this.touch(changedAt);
  }

  updateItem(
    id: string,
    input: Partial<Omit<CreatePurchaseItemInput, 'id'>>,
    changedAt = new Date(),
  ): void {
    this.ensureDraft();
    const index = this.props.items.findIndex((item) => item.id === id);
    if (index < 0) throw new InvalidPurchaseError('Purchase item was not found.');
    const current = this.props.items[index];
    this.props.items[index] = PurchaseItem.create({
      id,
      foodId: input.foodId === undefined ? current.foodId : input.foodId,
      inventoryItemId:
        input.inventoryItemId === undefined ? current.inventoryItemId : input.inventoryItemId,
      sourceShoppingItemId:
        input.sourceShoppingItemId === undefined
          ? current.sourceShoppingItemId
          : input.sourceShoppingItemId,
      nameSnapshot: input.nameSnapshot === undefined ? current.nameSnapshot : input.nameSnapshot,
      unit: input.unit === undefined ? current.unit : input.unit,
      quantity: input.quantity === undefined ? current.quantity : input.quantity,
    }).toProps();
    this.touch(changedAt);
  }

  removeItem(id: string, changedAt = new Date()): void {
    this.ensureDraft();
    const initialLength = this.props.items.length;
    this.props.items = this.props.items.filter((item) => item.id !== id);
    if (this.props.items.length === initialLength)
      throw new InvalidPurchaseError('Purchase item was not found.');
    this.touch(changedAt);
  }

  confirm(changedAt = new Date()): void {
    if (this.props.status === 'CONFIRMED')
      throw new InvalidPurchaseStateError('Purchase is already confirmed.');
    if (this.props.status !== 'DRAFT')
      throw new InvalidPurchaseStateError('Only draft purchases can be confirmed.');
    if (this.props.items.length === 0)
      throw new InvalidPurchaseError('Purchase must contain at least one item.');
    this.props.status = 'CONFIRMED';
    this.touch(changedAt);
  }

  cancel(changedAt = new Date()): void {
    if (this.props.status !== 'DRAFT')
      throw new InvalidPurchaseStateError('Only draft purchases can be cancelled.');
    this.props.status = 'CANCELLED';
    this.touch(changedAt);
  }

  toProps(): PurchaseProps {
    return {
      ...this.props,
      total: this.props.total,
      purchaseDate: new Date(this.props.purchaseDate),
      createdAt: new Date(this.props.createdAt),
      updatedAt: new Date(this.props.updatedAt),
      items: this.props.items.map((item) => ({ ...item, quantity: item.quantity })),
      ocrMetadata: this.props.ocrMetadata ? cloneOcrMetadata(this.props.ocrMetadata) : null,
    };
  }

  private ensureDraft(): void {
    if (this.props.status !== 'DRAFT')
      throw new InvalidPurchaseStateError('Only draft purchases can be edited.');
  }

  private touch(changedAt: Date): void {
    this.props.updatedAt = PurchaseDate.from(changedAt).value;
  }
}

function cloneOcrMetadata(value: NonNullable<PurchaseProps['ocrMetadata']>) {
  return {
    ...value,
    payload: structuredClone(value.payload),
    warnings: [...value.warnings],
  };
}

function requireId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidPurchaseError(`${label} is required.`);
  return normalized;
}

function ensureUniqueItems(ids: string[]): void {
  if (new Set(ids).size !== ids.length)
    throw new InvalidPurchaseError('Purchase item id must be unique.');
}
