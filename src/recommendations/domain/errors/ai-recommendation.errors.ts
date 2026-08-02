export class InvalidAiRecommendationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidAiRecommendationError.name;
  }
}

export class InvalidAiProposalTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidAiProposalTransitionError.name;
  }
}

export class AiProposalValidationRequiredError extends Error {
  constructor() {
    super('An AI proposal must be validated before it can be accepted.');
    this.name = AiProposalValidationRequiredError.name;
  }
}

export class AiProposalBlockingErrorsError extends Error {
  constructor() {
    super('An AI proposal with blocking validation errors cannot be accepted.');
    this.name = AiProposalBlockingErrorsError.name;
  }
}

export class AiProposalDecisionAlreadyRecordedError extends Error {
  constructor() {
    super('An AI proposal decision has already been recorded.');
    this.name = AiProposalDecisionAlreadyRecordedError.name;
  }
}

export class AiProposalExpiredError extends Error {
  constructor() {
    super('An expired AI proposal cannot be accepted.');
    this.name = AiProposalExpiredError.name;
  }
}
