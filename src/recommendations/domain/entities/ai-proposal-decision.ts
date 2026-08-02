import { InvalidAiRecommendationError } from '../errors/ai-recommendation.errors';
import type {
  AiDecisionType,
  AiProposalDecisionProps,
  StructuredPayload,
} from '../models/ai-recommendation.models';
import {
  AiDecisionTypeValue,
  AiProposalDecisionId,
} from '../value-objects/ai-recommendation.value-objects';

export class AiProposalDecision {
  private constructor(private readonly props: AiProposalDecisionProps) {}

  static create(input: AiProposalDecisionProps): AiProposalDecision {
    const selectedItems = normalizeSelectedItems(input.selectedItems);
    return new AiProposalDecision({
      ...input,
      id: AiProposalDecisionId.from(input.id).value,
      proposalId: required(input.proposalId, 'Proposal id'),
      decision: AiDecisionTypeValue.from(input.decision).value,
      selectedItems,
      editedPayload: clonePayload(input.editedPayload),
      decidedBy: required(input.decidedBy, 'Decision actor'),
      decidedAt: validDate(input.decidedAt),
      reason: input.reason?.trim() || null,
    });
  }

  static reconstitute(props: AiProposalDecisionProps): AiProposalDecision {
    return AiProposalDecision.create(props);
  }

  get id(): string {
    return this.props.id;
  }

  get proposalId(): string {
    return this.props.proposalId;
  }

  get decision(): AiDecisionType {
    return this.props.decision;
  }

  get selectedItems(): string[] {
    return [...this.props.selectedItems];
  }

  get editedPayload(): StructuredPayload | null {
    return clonePayload(this.props.editedPayload);
  }

  get decidedBy(): string {
    return this.props.decidedBy;
  }

  get decidedAt(): Date {
    return new Date(this.props.decidedAt);
  }

  get reason(): string | null {
    return this.props.reason;
  }

  toProps(): AiProposalDecisionProps {
    return {
      ...this.props,
      selectedItems: this.selectedItems,
      editedPayload: this.editedPayload,
      decidedAt: this.decidedAt,
    };
  }
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidAiRecommendationError(`${label} is required.`);
  return normalized;
}

function normalizeSelectedItems(values: string[]): string[] {
  if (!Array.isArray(values)) throw new InvalidAiRecommendationError('Selected items are invalid.');
  const normalized = values.map((value) => required(value, 'Selected item'));
  if (new Set(normalized).size !== normalized.length) {
    throw new InvalidAiRecommendationError('Selected items must be unique.');
  }
  return normalized;
}

function validDate(value: Date): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new InvalidAiRecommendationError('Decision date is invalid.');
  return date;
}

function clonePayload(payload: StructuredPayload | null): StructuredPayload | null {
  return payload === null ? null : structuredClone(payload);
}
