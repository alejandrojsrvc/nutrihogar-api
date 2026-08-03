import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../../application/ports/id-generator.port';

@Injectable()
export class UuidGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}
