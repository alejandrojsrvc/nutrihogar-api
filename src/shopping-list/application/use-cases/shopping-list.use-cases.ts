import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import { ensureHouseholdMemberAccess } from '../../../households/application/adult-profile-use-cases/ensure-household-member-access';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItemRepository } from '../../../inventory/application/ports/inventory-repository.port';
import { ShoppingList } from '../../domain/entities/shopping-list';
import { ShoppingListItem } from '../../domain/entities/shopping-list-item';
import { ShoppingListSource } from '../../domain/models/shopping-list.models';
import { ShoppingListItemNotFoundError } from '../errors/shopping-list-application.errors';
import { ShoppingListRepository } from '../ports/shopping-list-repository.port';

export interface AddShoppingListItemCommand {
  actorId: string;
  householdId: string;
  foodId?: string | null;
  name: string;
  quantity: Decimal.Value;
  unit: string;
  source?: ShoppingListSource;
  sourceReferenceId?: string | null;
  occurredAt?: Date;
}

export class GetShoppingListQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
  ) {}
  async execute(actorId: string, householdId: string): Promise<ShoppingList> {
    await ensureHouseholdMemberAccess(this.households, actorId, householdId);
    return (
      (await this.lists.findByHousehold(householdId)) ??
      ShoppingList.create({ id: crypto.randomUUID(), householdId, createdAt: new Date() })
    );
  }
}

export class AddShoppingListItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
  ) {}
  async execute(command: AddShoppingListItemCommand): Promise<ShoppingListItem> {
    await ensureHouseholdMemberAccess(this.households, command.actorId, command.householdId);
    const list =
      (await this.lists.findByHousehold(command.householdId)) ??
      ShoppingList.create({
        id: crypto.randomUUID(),
        householdId: command.householdId,
        createdAt: command.occurredAt ?? new Date(),
      });
    const item = list.addItem({
      id: crypto.randomUUID(),
      shoppingListId: list.id,
      ...command,
      source: command.source ?? 'MANUAL',
      sourceReferenceId: command.sourceReferenceId ?? null,
      occurredAt: command.occurredAt ?? new Date(),
    });
    await this.lists.save(list);
    return item;
  }
}

export class UpdateShoppingListItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
  ) {}
  async execute(input: {
    actorId: string;
    itemId: string;
    name?: string;
    quantity?: Decimal.Value;
    unit?: string;
    foodId?: string | null;
    source?: ShoppingListSource;
    sourceReferenceId?: string | null;
  }): Promise<ShoppingListItem> {
    const list = await this.findOwned(input.actorId, input.itemId);
    const item = this.item(list, input.itemId);
    item.update({ ...input, occurredAt: new Date() });
    await this.lists.save(list);
    return item;
  }
  private async findOwned(actorId: string, itemId: string) {
    const list = await this.lists.findByItemId(itemId);
    if (!list) throw new ShoppingListItemNotFoundError();
    await ensureHouseholdMemberAccess(this.households, actorId, list.householdId);
    return list;
  }
  private item(list: ShoppingList, id: string) {
    const item = list.findItem(id);
    if (!item) throw new ShoppingListItemNotFoundError();
    return item;
  }
}

export class MarkShoppingListItemPurchasedUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
  ) {}
  async execute(actorId: string, itemId: string): Promise<ShoppingListItem> {
    const list = await this.find(actorId, itemId);
    const item = list.findItem(itemId);
    if (!item) throw new ShoppingListItemNotFoundError();
    item.markPurchased(actorId, new Date());
    await this.lists.save(list);
    return item;
  }
  private async find(actorId: string, itemId: string) {
    const list = await this.lists.findByItemId(itemId);
    if (!list) throw new ShoppingListItemNotFoundError();
    await ensureHouseholdMemberAccess(this.households, actorId, list.householdId);
    return list;
  }
}

export class RemoveShoppingListItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
  ) {}
  async execute(actorId: string, itemId: string): Promise<void> {
    const list = await this.lists.findByItemId(itemId);
    if (!list) throw new ShoppingListItemNotFoundError();
    await ensureHouseholdMemberAccess(this.households, actorId, list.householdId);
    const item = list.findItem(itemId);
    if (!item) throw new ShoppingListItemNotFoundError();
    item.remove(actorId, new Date());
    await this.lists.save(list);
  }
}

export class GenerateInventoryShoppingListItemsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly lists: ShoppingListRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}
  async execute(actorId: string, householdId: string): Promise<ShoppingList> {
    await ensureHouseholdMemberAccess(this.households, actorId, householdId);
    const list =
      (await this.lists.findByHousehold(householdId)) ??
      ShoppingList.create({ id: crypto.randomUUID(), householdId, createdAt: new Date() });
    const inventory = await this.inventory.listByHousehold(householdId, {
      page: 1,
      limit: 10000,
      itemType: undefined,
      status: undefined,
    });
    const now = new Date();
    for (const source of inventory.items) {
      if (!['FOOD', 'CUSTOM'].includes(source.toProps().itemType)) continue;
      const props = source.toProps();
      const depleted = props.status === 'DEPLETED' || props.currentQuantity.lte(0);
      const belowMinimum =
        props.minimumQuantity !== null && props.currentQuantity.lt(props.minimumQuantity);
      if (!depleted && !belowMinimum) continue;
      // Below minimum requests the deficit; depleted requests minimum or one current unit when no minimum exists.
      const quantity = belowMinimum
        ? props.minimumQuantity!.minus(props.currentQuantity)
        : (props.minimumQuantity ?? props.currentQuantity);
      if (quantity.lte(0)) continue;
      list.addItem({
        id: crypto.randomUUID(),
        shoppingListId: list.id,
        foodId: props.foodId,
        name: props.nameSnapshot,
        quantity,
        unit: props.unit,
        source: depleted ? 'DEPLETED' : 'BELOW_MINIMUM',
        sourceReferenceId: props.id,
        actorId,
        occurredAt: now,
      });
    }
    await this.lists.save(list);
    return list;
  }
}
