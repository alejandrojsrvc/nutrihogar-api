export class FoodNotFoundError extends Error {
  constructor() {
    super('Food not found.');
    this.name = FoodNotFoundError.name;
  }
}
