import type { Prisma } from '@prisma/client';
import { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import type { AiGenerationRequestProps } from '../../domain/models/ai-recommendation.models';

export const aiGenerationRequestInclude = {
  adults: { orderBy: { adultProfileId: 'asc' } },
} satisfies Prisma.AiGenerationRequestInclude;

export type PrismaAiGenerationRequestRecord = Prisma.AiGenerationRequestGetPayload<{
  include: typeof aiGenerationRequestInclude;
}>;

export class PrismaAiGenerationRequestMapper {
  static toPersistence(
    request: AiGenerationRequest,
  ): Prisma.AiGenerationRequestUncheckedCreateInput {
    const props = request.toProps();
    return {
      id: props.id,
      householdId: props.householdId,
      proposalType: props.proposalType,
      contextVersion: props.contextVersion,
      promptVersion: props.promptVersion,
      requestedById: props.requestedBy,
      requestedAt: props.requestedAt,
      status: props.status,
      failureCode: props.failureCode,
      adults: {
        create: props.adultProfileIds.map((adultProfileId) => ({ adultProfileId })),
      },
    };
  }

  static toDomain(record: PrismaAiGenerationRequestRecord): AiGenerationRequest {
    const props: AiGenerationRequestProps = {
      id: record.id,
      householdId: record.householdId,
      adultProfileIds: record.adults.map(({ adultProfileId }) => adultProfileId),
      proposalType: record.proposalType,
      contextVersion: record.contextVersion,
      promptVersion: record.promptVersion,
      requestedBy: record.requestedById,
      requestedAt: record.requestedAt,
      status: record.status,
      failureCode: record.failureCode,
    };
    return AiGenerationRequest.reconstitute(props);
  }
}
