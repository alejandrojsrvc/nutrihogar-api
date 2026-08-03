import { InMemoryAiRateLimiter } from '../../infrastructure/rate-limit/in-memory-ai-rate-limiter';

describe('InMemoryAiRateLimiter', () => {
  it('limits requests independently per household and resets the window', () => {
    const limiter = new InMemoryAiRateLimiter();
    const first = limiter.consume({
      householdId: 'household-1',
      limit: 2,
      windowMs: 60_000,
      now: new Date('2026-08-02T12:00:00.000Z'),
    });
    const second = limiter.consume({
      householdId: 'household-1',
      limit: 2,
      windowMs: 60_000,
      now: new Date('2026-08-02T12:00:01.000Z'),
    });
    const blocked = limiter.consume({
      householdId: 'household-1',
      limit: 2,
      windowMs: 60_000,
      now: new Date('2026-08-02T12:00:02.000Z'),
    });
    const otherHousehold = limiter.consume({
      householdId: 'household-2',
      limit: 2,
      windowMs: 60_000,
      now: new Date('2026-08-02T12:00:02.000Z'),
    });
    const reset = limiter.consume({
      householdId: 'household-1',
      limit: 2,
      windowMs: 60_000,
      now: new Date('2026-08-02T12:01:00.000Z'),
    });

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 58 });
    expect(otherHousehold.allowed).toBe(true);
    expect(reset.allowed).toBe(true);
  });
});
