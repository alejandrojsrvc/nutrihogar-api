import {
  InvalidAiRecommendationError,
  InvalidAiProposalTransitionError,
} from '../errors/ai-recommendation.errors';
import type {
  AiGenerationRequestProps,
  AiGenerationRequestStatus,
  AiProposalType,
} from '../models/ai-recommendation.models';
import {
  AiGenerationRequestId,
  AiProposalTypeValue,
  AiPromptVersion,
} from '../value-objects/ai-recommendation.value-objects';

export class AiGenerationRequest {
  private constructor(private readonly props: AiGenerationRequestProps) {}

  static create(
    input: Omit<AiGenerationRequestProps, 'status' | 'failureCode'>,
  ): AiGenerationRequest {
    const requestedAt = validDate(input.requestedAt, 'Requested at');
    const adultProfileIds = uniqueRequiredIds(input.adultProfileIds, 'Adult profile ids');

    return new AiGenerationRequest({
      ...input,
      id: AiGenerationRequestId.from(input.id).value,
      householdId: required(input.householdId, 'Household id'),
      adultProfileIds,
      proposalType: AiProposalTypeValue.from(input.proposalType).value,
      contextVersion: required(input.contextVersion, 'Context version'),
      promptVersion: AiPromptVersion.from(input.promptVersion).value,
      requestedBy: required(input.requestedBy, 'Requester'),
      requestedAt,
      status: 'REQUESTED',
      failureCode: null,
    });
  }

  static reconstitute(props: AiGenerationRequestProps): AiGenerationRequest {
    return new AiGenerationRequest({
      ...props,
      id: AiGenerationRequestId.from(props.id).value,
      householdId: required(props.householdId, 'Household id'),
      adultProfileIds: uniqueRequiredIds(props.adultProfileIds, 'Adult profile ids'),
      proposalType: AiProposalTypeValue.from(props.proposalType).value,
      contextVersion: required(props.contextVersion, 'Context version'),
      promptVersion: AiPromptVersion.from(props.promptVersion).value,
      requestedBy: required(props.requestedBy, 'Requester'),
      requestedAt: validDate(props.requestedAt, 'Requested at'),
      failureCode: props.failureCode?.trim() || null,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get householdId(): string {
    return this.props.householdId;
  }

  get adultProfileIds(): string[] {
    return [...this.props.adultProfileIds];
  }

  get proposalType(): AiProposalType {
    return this.props.proposalType;
  }

  get contextVersion(): string {
    return this.props.contextVersion;
  }

  get promptVersion(): string {
    return this.props.promptVersion;
  }

  get requestedBy(): string {
    return this.props.requestedBy;
  }

  get requestedAt(): Date {
    return new Date(this.props.requestedAt);
  }

  get status(): AiGenerationRequestStatus {
    return this.props.status;
  }

  get failureCode(): string | null {
    return this.props.failureCode;
  }

  markGenerated(): void {
    if (this.props.status !== 'REQUESTED') {
      throw new InvalidAiProposalTransitionError(
        'Only requested AI generations can be marked generated.',
      );
    }
    this.props.status = 'GENERATED';
    this.props.failureCode = null;
  }

  markFailed(failureCode: string): void {
    if (this.props.status !== 'REQUESTED') {
      throw new InvalidAiProposalTransitionError('Only requested AI generations can fail.');
    }
    this.props.status = 'FAILED';
    this.props.failureCode = required(failureCode, 'Failure code');
  }

  toProps(): AiGenerationRequestProps {
    return {
      ...this.props,
      adultProfileIds: this.adultProfileIds,
      requestedAt: this.requestedAt,
    };
  }
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidAiRecommendationError(`${label} is required.`);
  return normalized;
}

function uniqueRequiredIds(values: string[], label: string): string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new InvalidAiRecommendationError(`${label} are required.`);
  }
  const normalized = values.map((value) => required(value, 'Adult profile id'));
  if (new Set(normalized).size !== normalized.length) {
    throw new InvalidAiRecommendationError(`${label} must be unique.`);
  }
  return normalized;
}

function validDate(value: Date, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new InvalidAiRecommendationError(`${label} is invalid.`);
  return date;
}
