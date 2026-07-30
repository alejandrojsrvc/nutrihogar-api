import { CryptoInvitationTokenService } from './crypto-invitation-token.service';

describe('CryptoInvitationTokenService', () => {
  it('generates a random token and exposes only its deterministic hash', () => {
    const service = new CryptoInvitationTokenService();

    const first = service.generate();
    const second = service.generate();

    expect(first.rawToken).toHaveLength(64);
    expect(first.tokenHash).toHaveLength(64);
    expect(first.tokenHash).toBe(service.hash(first.rawToken));
    expect(first.tokenHash).not.toBe(first.rawToken);
    expect(second.rawToken).not.toBe(first.rawToken);
  });
});
