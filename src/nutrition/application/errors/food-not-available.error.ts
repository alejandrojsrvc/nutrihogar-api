export class FoodNotAvailableError extends Error {
  constructor(foodId: string) {
    super(`Food ${foodId} is not active or visible for the household.`);
    this.name = FoodNotAvailableError.name;
  }
}
