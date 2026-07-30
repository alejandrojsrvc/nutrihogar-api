import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  GeneratedInvitationToken,
  InvitationTokenService,
} from '../../application/invitation-ports/invitation-token-service.port';

@Injectable()
export class CryptoInvitationTokenService implements InvitationTokenService {
  generate(): GeneratedInvitationToken {
    const rawToken = randomBytes(32).toString('hex');

    return {
      rawToken,
      tokenHash: this.hash(rawToken),
    };
  }

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
