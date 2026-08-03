export class InvalidIdentityError extends Error {
  constructor() {
    super('The identity is invalid or expired.');
    this.name = InvalidIdentityError.name;
  }
}
