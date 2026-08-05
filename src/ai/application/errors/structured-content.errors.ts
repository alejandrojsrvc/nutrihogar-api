export class StructuredContentConfigurationError extends Error {
  constructor(message = 'Structured content provider is not configured.') {
    super(message);
    this.name = 'StructuredContentConfigurationError';
  }
}

export class StructuredContentProcessingError extends Error {
  constructor(message = 'Structured content could not be generated.') {
    super(message);
    this.name = 'StructuredContentProcessingError';
  }
}
