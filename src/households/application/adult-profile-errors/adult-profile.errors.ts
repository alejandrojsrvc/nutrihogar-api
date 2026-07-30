export class AdultProfileNotFoundError extends Error {
  constructor() {
    super('Adult profile not found.');
    this.name = AdultProfileNotFoundError.name;
  }
}

export class AdultProfileAlreadyExistsError extends Error {
  constructor() {
    super('An active adult profile already exists for this user and household.');
    this.name = AdultProfileAlreadyExistsError.name;
  }
}

export class InvalidAdultProfileBirthDateError extends Error {
  constructor() {
    super('Birth date must be a valid date that is not in the future.');
    this.name = InvalidAdultProfileBirthDateError.name;
  }
}

export class InvalidAdultProfileHeightError extends Error {
  constructor() {
    super('Height must be greater than zero.');
    this.name = InvalidAdultProfileHeightError.name;
  }
}
