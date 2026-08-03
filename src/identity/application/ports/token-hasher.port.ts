export const TOKEN_HASHER = Symbol('TokenHasher');

export interface TokenHasher {
  hash(token: string): string;
  matches(token: string, hash: string): boolean;
}
