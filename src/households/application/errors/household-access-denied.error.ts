export class HouseholdAccessDeniedError extends Error {
  constructor() {
    super('Household access denied.');
    this.name = HouseholdAccessDeniedError.name;
  }
}
