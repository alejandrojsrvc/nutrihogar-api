import type {
  AiRateLimitInput,
  AiRateLimitResult,
  AiRateLimiter,
} from '../../application/ports/ai-rate-limiter.port';

interface WindowState {
  startedAt: number;
  count: number;
}

export class InMemoryAiRateLimiter implements AiRateLimiter {
  private readonly windows = new Map<string, WindowState>();

  consume(input: AiRateLimitInput): AiRateLimitResult {
    const limit = positiveInteger(input.limit, 'Rate limit');
    const windowMs = positiveInteger(input.windowMs, 'Rate limit window');
    const householdId = input.householdId.trim();
    if (!householdId) throw new Error('Household id is required.');
    const now = input.now?.getTime() ?? Date.now();
    const current = this.windows.get(householdId);
    const state =
      !current || now - current.startedAt >= windowMs ? { startedAt: now, count: 0 } : current;

    if (state.count >= limit) {
      this.windows.set(householdId, state);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((state.startedAt + windowMs - now) / 1000),
      };
    }

    state.count += 1;
    this.windows.set(householdId, state);
    return { allowed: true, remaining: limit - state.count, retryAfterSeconds: null };
  }
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be positive.`);
  return value;
}
