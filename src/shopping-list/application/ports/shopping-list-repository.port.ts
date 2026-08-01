import { ShoppingList } from '../../domain/entities/shopping-list';
export const SHOPPING_LIST_REPOSITORY = Symbol('ShoppingListRepository');
export interface ShoppingListRepository {
  findByHousehold(householdId: string): Promise<ShoppingList | null>;
  findByItemId(itemId: string): Promise<ShoppingList | null>;
  save(list: ShoppingList): Promise<void>;
}
