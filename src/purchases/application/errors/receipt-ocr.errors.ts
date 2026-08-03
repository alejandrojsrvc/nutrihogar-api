export class ReceiptOcrConfigurationError extends Error {
  constructor() {
    super('Receipt OCR is not configured.');
  }
}

export class ReceiptOcrProcessingError extends Error {
  constructor(message = 'The receipt could not be processed.') {
    super(message);
  }
}

export class ReceiptOcrDataError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ReceiptOcrFileError extends Error {
  constructor(message: string) {
    super(message);
  }
}
