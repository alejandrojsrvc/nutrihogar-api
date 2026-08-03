export class ShoppingListId {
  constructor(readonly value: string) {
    if (!value.trim()) throw new Error('Shopping list id is required.');
  }
}
