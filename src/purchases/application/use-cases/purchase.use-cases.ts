import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import { FoodCatalogReadRepository } from '../../../food-catalog/application/ports/food-catalog-read-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItemRepository } from '../../../inventory/application/ports/inventory-repository.port';
import { Purchase } from '../../domain/entities/purchase';
import { InvalidPurchaseStateError } from '../../domain/errors/purchase.errors';
import { PurchaseId } from '../../domain/value-objects/purchase-id';
import { HouseholdId } from '../../domain/value-objects/household-id';
import { PurchaseRepository } from '../ports/purchase-repository.port';
import { ShoppingListRepository } from '../../../shopping-list/application/ports/shopping-list-repository.port';
import {
  PurchaseInventoryUnitOfWork,
  PurchaseConfirmationItem,
} from '../ports/purchase-inventory-unit-of-work.port';
import {
  PurchaseAccessDeniedError,
  PurchaseAdminRequiredError,
  PurchaseFoodNotAvailableError,
  PurchaseIdempotencyConflictError,
  PurchaseInventorySelectionError,
  PurchaseNotFoundError,
} from '../errors/purchase-application.errors';
import { normalizePurchaseQuantity } from '../purchase-quantity-converter';
import { PurchaseOcrMetadata } from '../../domain/models/purchase.models';

export interface PurchaseItemCommand {
  id?: string;
  foodId?: string | null;
  inventoryItemId?: string | null;
  sourceShoppingItemId?: string | null;
  nameSnapshot: string;
  unit: string;
  quantity: Decimal.Value;
}
export interface CreatePurchaseCommand {
  actorId: string;
  householdId: string;
  storeName: string;
  purchaseDate: Date;
  total: Decimal.Value;
  currency?: string;
  items: PurchaseItemCommand[];
  idempotencyKey?: string | null;
  source?: 'MANUAL' | 'SHOPPING_LIST' | 'OCR';
  ocrMetadata?: PurchaseOcrMetadata | null;
}
interface PurchaseListFilters {
  status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  from?: Date;
  to?: Date;
  storeName?: string;
  page?: number;
  limit?: number;
}

export class CreatePurchaseUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
  ) {}
  async execute(command: CreatePurchaseCommand): Promise<Purchase> {
    const access = await this.households.findAccess(command.actorId, command.householdId);
    if (!access || access.status !== 'ACTIVE') throw new PurchaseAccessDeniedError();
    const key = command.idempotencyKey?.trim() || null;
    if (key && this.purchases.findByIdempotencyKey) {
      const existing = await this.purchases.findByIdempotencyKey(command.householdId, key);
      if (existing) return existing;
    }
    const purchase = Purchase.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      registeredById: command.actorId,
      storeName: command.storeName,
      purchaseDate: command.purchaseDate,
      currency: command.currency ?? access.household.currency,
      total: command.total,
      idempotencyKey: key,
      source: command.source,
      items: command.items.map((item) => ({ ...item, id: item.id ?? crypto.randomUUID() })),
      createdAt: new Date(),
      ocrMetadata: command.ocrMetadata,
    });
    try {
      await this.purchases.save(purchase);
    } catch (error) {
      if (key && this.purchases.findByIdempotencyKey) {
        const existing = await this.purchases.findByIdempotencyKey(command.householdId, key);
        if (existing) return existing;
      }
      throw error;
    }
    return purchase;
  }
}

export class UpdatePurchaseUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
  ) {}
  async execute(input: {
    actorId: string;
    purchaseId: string;
    storeName?: string;
    purchaseDate?: Date;
    total?: Decimal.Value;
    items?: PurchaseItemCommand[];
  }): Promise<Purchase> {
    const purchase = await getOwned(
      this.households,
      this.purchases,
      input.actorId,
      input.purchaseId,
    );
    if (purchase.status !== 'DRAFT')
      throw new InvalidPurchaseStateError('Only draft purchases can be edited.');
    if (input.items) {
      for (const item of purchase.items) purchase.removeItem(item.id);
      for (const item of input.items)
        purchase.addItem({ ...item, id: item.id ?? crypto.randomUUID() });
    }
    // Purchase currently exposes only item edits; header values are immutable in the domain after creation.
    if (
      input.storeName !== undefined ||
      input.purchaseDate !== undefined ||
      input.total !== undefined
    ) {
      const props = purchase.toProps();
      const replacement = Purchase.create({
        ...props,
        id: props.id,
        items: (input.items ?? props.items).map((item) => ({
          ...item,
          id: item.id ?? crypto.randomUUID(),
          quantity: item.quantity.toString(),
        })),
        storeName: input.storeName ?? props.storeName,
        purchaseDate: input.purchaseDate ?? props.purchaseDate,
        total: input.total ?? props.total,
        createdAt: props.createdAt,
        idempotencyKey: props.idempotencyKey,
      });
      await this.purchases.save(replacement);
      return replacement;
    }
    await this.purchases.save(purchase);
    return purchase;
  }
}

export class GetPurchaseQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
  ) {}
  async execute(actorId: string, purchaseId: string): Promise<Purchase> {
    return getOwned(this.households, this.purchases, actorId, purchaseId);
  }
}

export class ListPurchasesQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
  ) {}
  async execute(actorId: string, householdId: string, filters: PurchaseListFilters = {}) {
    await ensureActiveAccess(this.households, actorId, householdId);
    return this.purchases.listByHousehold(HouseholdId.from(householdId), {
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      storeName: filters.storeName,
    });
  }
}

export class ConfirmPurchaseUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
    private readonly foods: FoodCatalogReadRepository,
    private readonly inventory: InventoryItemRepository,
    private readonly transaction: PurchaseInventoryUnitOfWork,
  ) {}
  async execute(input: {
    actorId: string;
    purchaseId: string;
    selections?: Record<string, string>;
  }): Promise<Purchase> {
    const access = await this.households.findAccess(
      input.actorId,
      await householdOf(this.purchases, input.purchaseId),
    );
    if (!access || access.status !== 'ACTIVE') throw new PurchaseAccessDeniedError();
    // Inventory policy reserves state-changing confirmation/cancellation for household admins.
    if (access.role !== 'ADMIN') throw new PurchaseAdminRequiredError();
    const purchase = await this.purchases.findById(PurchaseId.from(input.purchaseId));
    if (!purchase) throw new PurchaseNotFoundError();
    if (purchase.status === 'CONFIRMED') return purchase;
    if (purchase.status !== 'DRAFT')
      throw new InvalidPurchaseStateError('Only draft purchases can be confirmed.');
    const items: PurchaseConfirmationItem[] = [];
    for (const item of purchase.items) {
      const food = item.foodId
        ? await this.foods.findVisibleById(input.actorId, item.foodId)
        : null;
      if (item.foodId && (!food || (!food.isGlobal && food.householdId !== purchase.householdId)))
        throw new PurchaseFoodNotAvailableError();
      const normalized = normalizePurchaseQuantity(item.quantity, item.unit, food?.referenceUnit);
      const unit = normalized.unit;
      let inventoryItemId = input.selections?.[item.id] ?? item.inventoryItemId;
      if (inventoryItemId) {
        const selected = await this.inventory.findById(inventoryItemId);
        if (
          !selected ||
          selected.householdId !== purchase.householdId ||
          !['FOOD', 'CUSTOM'].includes(selected.itemType) ||
          selected.unit !== unit ||
          (item.foodId && selected.foodId !== item.foodId) ||
          (!item.foodId && selected.itemType !== 'CUSTOM')
        )
          throw new PurchaseInventorySelectionError();
      } else if (item.foodId) {
        // The inventory adapter orders by expiry, name and id; the first compatible candidate is deterministic.
        const candidates = await this.inventory.listByHousehold(purchase.householdId, {
          page: 1,
          limit: 1000,
          itemType: 'FOOD',
          foodId: item.foodId,
          status: undefined,
        });
        inventoryItemId =
          candidates.items.find(
            (candidate) => candidate.unit === unit && candidate.status !== 'ARCHIVED',
          )?.id ?? null;
      }
      items.push({
        purchaseItemId: item.id,
        foodId: item.foodId,
        inventoryItemId,
        name: item.nameSnapshot,
        quantity: normalized.quantity.toString(),
        unit,
        sourceShoppingItemId: item.sourceShoppingItemId,
      });
    }
    return this.transaction.confirm({
      purchase,
      items,
      actorId: input.actorId,
      occurredAt: new Date(),
    });
  }
}

export class CancelPurchaseUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly purchases: PurchaseRepository,
  ) {}
  async execute(actorId: string, purchaseId: string): Promise<Purchase> {
    const purchase = await getOwned(this.households, this.purchases, actorId, purchaseId);
    const access = await this.households.findAccess(actorId, purchase.householdId);
    if (access?.role !== 'ADMIN') throw new PurchaseAdminRequiredError();
    purchase.cancel();
    await this.purchases.save(purchase);
    return purchase;
  }
}

export class CreatePurchaseFromShoppingListUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
    private readonly purchases: PurchaseRepository,
    private readonly createPurchase: CreatePurchaseUseCase,
  ) {}
  async execute(input: {
    actorId: string;
    householdId: string;
    itemIds: string[];
    quantities?: Record<string, Decimal.Value>;
    storeName: string;
    purchaseDate: Date;
    total: Decimal.Value;
    idempotencyKey: string;
  }): Promise<Purchase> {
    if (!input.idempotencyKey?.trim()) throw new PurchaseIdempotencyConflictError();
    await ensureActiveAccess(this.households, input.actorId, input.householdId);
    const existing = this.purchases.findByIdempotencyKey
      ? await this.purchases.findByIdempotencyKey(input.householdId, input.idempotencyKey)
      : null;
    if (existing) return existing;
    const list = await this.lists.findByHousehold(input.householdId);
    if (!list) throw new PurchaseNotFoundError();
    const selected = input.itemIds.map((id) => list.findItem(id));
    if (selected.some((item) => !item || item.status !== 'PENDING'))
      throw new PurchaseIdempotencyConflictError();
    const items = selected.map((item) => ({
      id: crypto.randomUUID(),
      foodId: item!.foodId,
      sourceShoppingItemId: item!.id,
      nameSnapshot: item!.name,
      unit: item!.unit,
      quantity: input.quantities?.[item!.id] ?? item!.quantity.toString(),
    }));
    if (items.some((item) => !item.quantity)) throw new PurchaseIdempotencyConflictError();
    return this.createPurchase.execute({
      actorId: input.actorId,
      householdId: input.householdId,
      storeName: input.storeName,
      purchaseDate: input.purchaseDate,
      total: input.total,
      items,
      idempotencyKey: input.idempotencyKey,
      source: 'SHOPPING_LIST',
    });
  }
}

async function getOwned(
  households: HouseholdRepository,
  purchases: PurchaseRepository,
  actorId: string,
  purchaseId: string,
): Promise<Purchase> {
  const purchase = await purchases.findById(PurchaseId.from(purchaseId));
  if (!purchase) throw new PurchaseNotFoundError();
  await ensureActiveAccess(households, actorId, purchase.householdId);
  return purchase;
}
async function householdOf(purchases: PurchaseRepository, id: string): Promise<string> {
  const purchase = await purchases.findById(PurchaseId.from(id));
  if (!purchase) throw new PurchaseNotFoundError();
  return purchase.householdId;
}
async function ensureActiveAccess(
  households: HouseholdRepository,
  actorId: string,
  householdId: string,
): Promise<void> {
  const access = await households.findAccess(actorId, householdId);
  if (!access || access.status !== 'ACTIVE') throw new PurchaseAccessDeniedError();
}
