export const AI_RATE_LIMITER = Symbol('AiRateLimiter');

export interface AiRateLimitInput {
  householdId: string;
  limit: number;
  windowMs: number;
  now?: Date;
}

export interface AiRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
}

export interface AiRateLimiter {
  consume(input: AiRateLimitInput): AiRateLimitResult;
}
