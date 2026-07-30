export class InvalidIdentityError extends Error {
  constructor() {
    super('The Supabase identity is invalid or expired.');
    this.name = InvalidIdentityError.name;
  }
}
