export class HouseholdNotFoundError extends Error {
  constructor() {
    super('Household not found.');
    this.name = HouseholdNotFoundError.name;
  }
}
