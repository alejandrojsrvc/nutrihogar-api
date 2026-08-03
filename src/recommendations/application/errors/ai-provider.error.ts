export type AiProviderErrorCode =
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_INVALID_RESPONSE'
  | 'AI_CONTENT_REJECTED'
  | 'AI_CONFIGURATION_ERROR';

export class AiProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = AiProviderError.name;
  }
}
