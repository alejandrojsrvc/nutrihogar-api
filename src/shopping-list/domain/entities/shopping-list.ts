import { ShoppingListItem } from './shopping-list-item';
import { AddShoppingListItemInput, ShoppingListProps } from '../models/shopping-list.models';

export class ShoppingList {
  private constructor(
    private readonly idValue: string,
    private readonly householdIdValue: string,
    private readonly createdAtValue: Date,
    private updatedAtValue: Date,
    private readonly itemEntities: ShoppingListItem[],
  ) {}

  static create(input: { id: string; householdId: string; createdAt: Date }): ShoppingList {
    return new ShoppingList(input.id, input.householdId, input.createdAt, input.createdAt, []);
  }

  static reconstitute(props: ShoppingListProps): ShoppingList {
    return new ShoppingList(
      props.id,
      props.householdId,
      props.createdAt,
      props.updatedAt,
      props.items.map((item) => ShoppingListItem.reconstitute(item)),
    );
  }

  get id() {
    return this.idValue;
  }

  get householdId() {
    return this.householdIdValue;
  }

  get items() {
    return [...this.itemEntities];
  }

  addItem(input: AddShoppingListItemInput): ShoppingListItem {
    const compatible = this.itemEntities.find((item) => item.isCompatible(input));
    if (compatible) {
      compatible.combine(input.quantity, input.occurredAt);
      this.updatedAtValue = input.occurredAt;
      return compatible;
    }
    const item = ShoppingListItem.create({
      ...input,
      foodId: input.foodId ?? null,
      sourceReferenceId: input.sourceReferenceId ?? null,
      createdAt: input.occurredAt,
    });
    this.itemEntities.push(item);
    this.updatedAtValue = input.occurredAt;
    return item;
  }

  findItem(id: string): ShoppingListItem | undefined {
    return this.itemEntities.find((item) => item.id === id);
  }

  findPendingBySource(
    source: string,
    sourceReferenceId: string,
    foodId: string,
    unit: string,
  ): ShoppingListItem | undefined {
    return this.itemEntities.find(
      (item) =>
        item.status === 'PENDING' &&
        item.source === source &&
        item.toProps().sourceReferenceId === sourceReferenceId &&
        item.foodId === foodId &&
        item.unit === unit,
    );
  }

  toProps(): ShoppingListProps {
    return {
      id: this.idValue,
      householdId: this.householdIdValue,
      createdAt: new Date(this.createdAtValue),
      updatedAt: new Date(this.updatedAtValue),
      items: this.itemEntities.map((item) => item.toProps()),
    };
  }
}
