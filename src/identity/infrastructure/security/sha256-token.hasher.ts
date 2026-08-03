import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TokenHasher } from '../../application/ports/token-hasher.port';

@Injectable()
export class Sha256TokenHasher implements TokenHasher {
  hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  matches(token: string, hash: string): boolean {
    const actual = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(hash, 'hex');

    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
}
