import type { Prisma } from '@prisma/client';
import { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';
import type { AiGeneratedProposalProps } from '../../domain/models/ai-recommendation.models';
import { aiProposalValidationInclude } from './prisma-ai-proposal-validation.mapper';

export const aiGeneratedProposalInclude = {
  validation: aiProposalValidationInclude,
  decision: true,
} satisfies Prisma.AiGeneratedProposalInclude;

export type PrismaAiGeneratedProposalRecord = Prisma.AiGeneratedProposalGetPayload<{
  include: typeof aiGeneratedProposalInclude;
}>;

export class PrismaAiProposalMapper {
  static toPersistence(
    proposal: AiGeneratedProposal,
  ): Prisma.AiGeneratedProposalUncheckedCreateInput {
    const props = proposal.toProps();
    return {
      id: props.id,
      requestId: props.requestId,
      provider: props.provider,
      model: props.model,
      structuredPayload: props.structuredPayload,
      rawResponseReference: props.rawResponseReference,
      status: props.status,
      generatedAt: props.generatedAt,
      expiresAt: props.expiresAt,
      inputTokenCount: props.inputTokenCount ?? null,
      outputTokenCount: props.outputTokenCount ?? null,
      estimatedCost: props.estimatedCost ?? null,
      latencyMilliseconds: props.latencyMilliseconds ?? null,
      correlationId: props.correlationId ?? null,
    };
  }

  static toDomain(record: PrismaAiGeneratedProposalRecord): AiGeneratedProposal {
    const props: AiGeneratedProposalProps = {
      id: record.id,
      requestId: record.requestId,
      provider: record.provider,
      model: record.model,
      structuredPayload: asStructuredPayload(record.structuredPayload),
      rawResponseReference: record.rawResponseReference,
      status: record.status,
      generatedAt: record.generatedAt,
      expiresAt: record.expiresAt,
      inputTokenCount: record.inputTokenCount,
      outputTokenCount: record.outputTokenCount,
      estimatedCost: record.estimatedCost?.toString() ?? null,
      latencyMilliseconds: record.latencyMilliseconds,
      correlationId: record.correlationId,
      validation: record.validation,
      decision: record.decision,
    };
    return AiGeneratedProposal.reconstitute(props);
  }
}

function asStructuredPayload(value: Prisma.JsonValue): Record<string, unknown> {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('AI proposal payload must be a JSON object.');
  }
  return value;
}
