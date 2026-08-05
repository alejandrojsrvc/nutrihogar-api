export class GeminiContentConfigurationError extends Error {
  constructor(message = 'Gemini content client is not configured.') {
    super(message);
    this.name = 'GeminiContentConfigurationError';
  }
}

export class GeminiContentProcessingError extends Error {
  constructor(message = 'Gemini content could not be generated.') {
    super(message);
    this.name = 'GeminiContentProcessingError';
  }
}
