export class ShoppingListItemId {
  constructor(readonly value: string) {
    if (!value.trim()) throw new Error('Shopping list item id is required.');
  }
}
