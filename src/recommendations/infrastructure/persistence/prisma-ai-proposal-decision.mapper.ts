import { Prisma } from '@prisma/client';
import { AiProposalDecision } from '../../domain/entities/ai-proposal-decision';
import type { AiProposalDecisionProps } from '../../domain/models/ai-recommendation.models';

export class PrismaAiProposalDecisionMapper {
  static toPersistence(
    decision: AiProposalDecision,
  ): Prisma.AiProposalDecisionUncheckedCreateInput {
    const props = decision.toProps();
    return {
      id: props.id,
      proposalId: props.proposalId,
      decision: props.decision,
      selectedItems: props.selectedItems,
      editedPayload:
        props.editedPayload === null ? Prisma.JsonNull : toInputJson(props.editedPayload),
      decidedById: props.decidedBy,
      decidedAt: props.decidedAt,
      reason: props.reason,
    };
  }

  static toDomain(
    record: Prisma.AiProposalDecisionGetPayload<Prisma.AiProposalDecisionDefaultArgs>,
  ): AiProposalDecision {
    const props: AiProposalDecisionProps = {
      id: record.id,
      proposalId: record.proposalId,
      decision: record.decision,
      selectedItems: asStringArray(record.selectedItems),
      editedPayload: record.editedPayload ? asPayload(record.editedPayload) : null,
      decidedBy: record.decidedById,
      decidedAt: record.decidedAt,
      reason: record.reason,
    };
    return AiProposalDecision.reconstitute(props);
  }
}

function asStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('AI decision selected items must be a JSON array of strings.');
  }
  return value as unknown as string[];
}

function asPayload(value: Prisma.JsonValue): Record<string, unknown> {
  if (Array.isArray(value) || value === null || typeof value !== 'object') {
    throw new Error('AI decision edited payload must be a JSON object.');
  }
  return value;
}

function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
