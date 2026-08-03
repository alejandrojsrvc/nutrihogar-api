import {
  AiProposalBlockingErrorsError,
  AiProposalDecisionAlreadyRecordedError,
  AiProposalExpiredError,
  AiProposalValidationRequiredError,
  InvalidAiProposalTransitionError,
  InvalidAiRecommendationError,
} from '../errors/ai-recommendation.errors';
import type {
  AiGeneratedProposalProps,
  AiProposalDecisionProps,
  AiProposalValidationProps,
  AiProposalStatus,
  StructuredPayload,
} from '../models/ai-recommendation.models';
import { AiProposalDecision } from './ai-proposal-decision';
import { AiProposalValidation } from './ai-proposal-validation';
import {
  AiGeneratedProposalId,
  AiProviderReference,
  AiModelReference,
} from '../value-objects/ai-recommendation.value-objects';

export class AiGeneratedProposal {
  private constructor(private readonly props: AiGeneratedProposalProps) {}

  static register(
    input: Omit<AiGeneratedProposalProps, 'status' | 'validation' | 'decision'>,
  ): AiGeneratedProposal {
    return new AiGeneratedProposal({
      ...input,
      id: AiGeneratedProposalId.from(input.id).value,
      requestId: required(input.requestId, 'Generation request id'),
      provider: AiProviderReference.from(input.provider).value,
      model: AiModelReference.from(input.model).value,
      structuredPayload: clonePayload(input.structuredPayload),
      rawResponseReference: input.rawResponseReference?.trim() || null,
      status: 'GENERATED',
      generatedAt: validDate(input.generatedAt, 'Generation date'),
      expiresAt: input.expiresAt ? validDate(input.expiresAt, 'Expiration date') : null,
      validation: null,
      decision: null,
    });
  }

  static reconstitute(props: AiGeneratedProposalProps): AiGeneratedProposal {
    return new AiGeneratedProposal({
      ...props,
      id: AiGeneratedProposalId.from(props.id).value,
      requestId: required(props.requestId, 'Generation request id'),
      provider: AiProviderReference.from(props.provider).value,
      model: AiModelReference.from(props.model).value,
      structuredPayload: clonePayload(props.structuredPayload),
      rawResponseReference: props.rawResponseReference?.trim() || null,
      generatedAt: validDate(props.generatedAt, 'Generation date'),
      expiresAt: props.expiresAt ? validDate(props.expiresAt, 'Expiration date') : null,
      validation: props.validation
        ? AiProposalValidation.reconstitute(props.validation).toProps()
        : null,
      decision: props.decision ? AiProposalDecision.reconstitute(props.decision).toProps() : null,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get requestId(): string {
    return this.props.requestId;
  }

  get provider(): string {
    return this.props.provider;
  }

  get model(): string {
    return this.props.model;
  }

  get structuredPayload(): StructuredPayload {
    return clonePayload(this.props.structuredPayload);
  }

  get rawResponseReference(): string | null {
    return this.props.rawResponseReference;
  }

  get status(): AiProposalStatus {
    return this.props.status;
  }

  get generatedAt(): Date {
    return new Date(this.props.generatedAt);
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt ? new Date(this.props.expiresAt) : null;
  }

  get validation(): AiProposalValidationProps | null {
    return this.props.validation ? copyValidation(this.props.validation) : null;
  }

  get decision(): AiProposalDecisionProps | null {
    return this.props.decision ? copyDecision(this.props.decision) : null;
  }

  attachValidation(validation: AiProposalValidation): void {
    this.ensureNotTerminal();
    if (validation.proposalId !== this.id) {
      throw new InvalidAiRecommendationError('Validation belongs to another AI proposal.');
    }
    this.props.validation = validation.toProps();
    this.props.status = validation.hasBlockingErrors() ? 'REQUIRES_CHANGES' : 'VALIDATED';
  }

  markReadyForReview(): void {
    this.ensureNotTerminal();
    if (!this.props.validation) throw new AiProposalValidationRequiredError();
    if (hasBlockingErrors(this.props.validation)) throw new AiProposalBlockingErrorsError();
    this.props.status = 'READY_FOR_REVIEW';
  }

  accept(input: {
    id?: string;
    selectedItems?: string[];
    editedPayload?: StructuredPayload | null;
    decidedBy: string;
    decidedAt: Date;
  }): AiProposalDecision {
    this.ensureAcceptable(input.decidedAt);
    if (!this.props.validation) throw new AiProposalValidationRequiredError();
    if (hasBlockingErrors(this.props.validation)) throw new AiProposalBlockingErrorsError();
    if (this.props.status !== 'READY_FOR_REVIEW' && this.props.status !== 'VALIDATED') {
      throw new InvalidAiProposalTransitionError('Only validated AI proposals can be accepted.');
    }
    const decision = this.createDecision({
      id: input.id,
      decision: input.editedPayload ? 'ACCEPT_WITH_CHANGES' : 'ACCEPT',
      selectedItems: input.selectedItems ?? [],
      editedPayload: input.editedPayload ?? null,
      decidedBy: input.decidedBy,
      decidedAt: input.decidedAt,
    });
    this.props.decision = decision.toProps();
    this.props.status = decision.decision === 'ACCEPT' ? 'ACCEPTED' : 'PARTIALLY_ACCEPTED';
    return decision;
  }

  acceptPartially(input: {
    id?: string;
    selectedItems: string[];
    editedPayload?: StructuredPayload | null;
    decidedBy: string;
    decidedAt: Date;
  }): AiProposalDecision {
    if (input.selectedItems.length === 0) {
      throw new InvalidAiRecommendationError('Partial acceptance requires selected items.');
    }
    this.ensureAcceptable(input.decidedAt);
    if (!this.props.validation) throw new AiProposalValidationRequiredError();
    if (hasBlockingErrors(this.props.validation)) throw new AiProposalBlockingErrorsError();
    if (this.props.status !== 'READY_FOR_REVIEW' && this.props.status !== 'VALIDATED') {
      throw new InvalidAiProposalTransitionError('Only validated AI proposals can be accepted.');
    }
    const decision = this.createDecision({
      id: input.id,
      decision: 'ACCEPT_WITH_CHANGES',
      selectedItems: input.selectedItems,
      editedPayload: input.editedPayload ?? null,
      decidedBy: input.decidedBy,
      decidedAt: input.decidedAt,
    });
    this.props.decision = decision.toProps();
    this.props.status = 'PARTIALLY_ACCEPTED';
    return decision;
  }

  reject(input: {
    id?: string;
    decidedBy: string;
    decidedAt: Date;
    reason?: string | null;
  }): AiProposalDecision {
    this.ensureNotTerminal();
    const decision = this.createDecision({
      id: input.id,
      decision: 'REJECT',
      selectedItems: [],
      editedPayload: null,
      decidedBy: input.decidedBy,
      decidedAt: input.decidedAt,
      reason: input.reason ?? null,
    });
    this.props.decision = decision.toProps();
    this.props.status = 'REJECTED';
    return decision;
  }

  expire(at: Date): void {
    if (this.props.decision) return;
    const now = validDate(at, 'Expiration check date');
    if (this.props.expiresAt && now >= this.props.expiresAt) this.props.status = 'EXPIRED';
  }

  toProps(): AiGeneratedProposalProps {
    return {
      ...this.props,
      structuredPayload: this.structuredPayload,
      generatedAt: this.generatedAt,
      expiresAt: this.expiresAt,
      validation: this.validation,
      decision: this.decision,
    };
  }

  private createDecision(
    input: Omit<AiProposalDecisionProps, 'id' | 'proposalId' | 'reason'> & {
      id?: string;
      reason?: string | null;
    },
  ): AiProposalDecision {
    if (this.props.decision) throw new AiProposalDecisionAlreadyRecordedError();
    return AiProposalDecision.create({
      ...input,
      id: input.id ?? crypto.randomUUID(),
      proposalId: this.id,
      reason: input.reason ?? null,
    });
  }

  private ensureAcceptable(at: Date): void {
    this.expire(at);
    if (this.props.status === 'EXPIRED') throw new AiProposalExpiredError();
    this.ensureNotTerminal();
  }

  private ensureNotTerminal(): void {
    if (this.props.decision) throw new AiProposalDecisionAlreadyRecordedError();
    if (this.props.status === 'EXPIRED') throw new AiProposalExpiredError();
    if (['ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'FAILED'].includes(this.props.status)) {
      throw new InvalidAiProposalTransitionError('The AI proposal is in a terminal state.');
    }
  }
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidAiRecommendationError(`${label} is required.`);
  return normalized;
}

function validDate(value: Date, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new InvalidAiRecommendationError(`${label} is invalid.`);
  return date;
}

function clonePayload(payload: StructuredPayload): StructuredPayload;
function clonePayload(payload: StructuredPayload | null): StructuredPayload | null;
function clonePayload(payload: StructuredPayload | null): StructuredPayload | null {
  return payload === null ? null : structuredClone(payload);
}

function hasBlockingErrors(validation: AiProposalValidationProps | null): boolean {
  return validation?.errors.some((error) => error.severity === 'BLOCKING') ?? false;
}

function copyValidation(validation: AiProposalValidationProps): AiProposalValidationProps {
  return {
    ...validation,
    warnings: validation.warnings.map((warning) => ({ ...warning })),
    errors: validation.errors.map((error) => ({ ...error })),
    validatedAt: new Date(validation.validatedAt),
  };
}

function copyDecision(decision: AiProposalDecisionProps): AiProposalDecisionProps {
  return {
    ...decision,
    selectedItems: [...decision.selectedItems],
    editedPayload: decision.editedPayload ? structuredClone(decision.editedPayload) : null,
    decidedAt: new Date(decision.decidedAt),
  };
}
