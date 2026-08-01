import Decimal from 'decimal.js';
import { ShoppingList } from '../../domain/entities/shopping-list';
import { ShoppingListItemProps } from '../../domain/models/shopping-list.models';

export interface ShoppingListItemRecord extends Omit<ShoppingListItemProps, 'quantity'> {
  quantity: { toString(): string };
}
export interface ShoppingListRecord {
  id: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
  items: ShoppingListItemRecord[];
}

export class PrismaShoppingListMapper {
  static toDomain(record: ShoppingListRecord): ShoppingList {
    return ShoppingList.reconstitute({
      ...record,
      items: record.items.map((item) => ({
        ...item,
        quantity: new Decimal(item.quantity.toString()),
      })),
    });
  }
  static toPersistence(list: ShoppingList) {
    const props = list.toProps();
    return {
      ...props,
      items: props.items.map((item) => ({ ...item, quantity: item.quantity.toString() })),
    };
  }
}
