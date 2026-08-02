import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type {
  AiProposalFilters,
  AiProposalRepository,
  PaginatedAiProposals,
} from '../../application/ports/ai-proposal-repository.port';
import { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';
import { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import { AiProposalDecision } from '../../domain/entities/ai-proposal-decision';
import { AiProposalValidation } from '../../domain/entities/ai-proposal-validation';
import type { AiGeneratedProposalId } from '../../domain/value-objects/ai-recommendation.value-objects';
import { PrismaAiGenerationRequestMapper } from './prisma-ai-generation-request.mapper';
import { PrismaAiProposalDecisionMapper } from './prisma-ai-proposal-decision.mapper';
import { aiGeneratedProposalInclude, PrismaAiProposalMapper } from './prisma-ai-proposal.mapper';
import { PrismaAiProposalValidationMapper } from './prisma-ai-proposal-validation.mapper';

@Injectable()
export class PrismaAiProposalRepository implements AiProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: AiGeneratedProposalId): Promise<AiGeneratedProposal | null> {
    const record = await this.prisma.aiGeneratedProposal.findUnique({
      where: { id: id.value },
      include: aiGeneratedProposalInclude,
    });
    return record ? PrismaAiProposalMapper.toDomain(record) : null;
  }

  async findByIdForHousehold(
    id: AiGeneratedProposalId,
    householdId: string,
  ): Promise<AiGeneratedProposal | null> {
    const record = await this.prisma.aiGeneratedProposal.findFirst({
      where: { id: id.value, request: { householdId } },
      include: aiGeneratedProposalInclude,
    });
    return record ? PrismaAiProposalMapper.toDomain(record) : null;
  }

  async saveRequest(request: AiGenerationRequest): Promise<void> {
    const data = PrismaAiGenerationRequestMapper.toPersistence(request);
    await this.prisma.aiGenerationRequest.upsert({
      where: { id: data.id },
      create: data,
      update: {
        proposalType: data.proposalType,
        contextVersion: data.contextVersion,
        promptVersion: data.promptVersion,
        requestedById: data.requestedById,
        requestedAt: data.requestedAt,
        status: data.status,
        failureCode: data.failureCode,
        adults: {
          deleteMany: {},
          create: request.adultProfileIds.map((adultProfileId) => ({ adultProfileId })),
        },
      },
    });
  }

  async saveProposal(proposal: AiGeneratedProposal): Promise<void> {
    const data = PrismaAiProposalMapper.toPersistence(proposal);
    const validation = proposal.validation;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.aiGeneratedProposal.upsert({
        where: { id: data.id },
        create: data,
        update: {
          provider: data.provider,
          model: data.model,
          structuredPayload: data.structuredPayload,
          rawResponseReference: data.rawResponseReference,
          status: data.status,
          generatedAt: data.generatedAt,
          expiresAt: data.expiresAt,
          inputTokenCount: data.inputTokenCount,
          outputTokenCount: data.outputTokenCount,
          estimatedCost: data.estimatedCost,
          latencyMilliseconds: data.latencyMilliseconds,
          correlationId: data.correlationId,
        },
      });

      if (validation) {
        const validationData = PrismaAiProposalValidationMapper.toPersistence(
          AiProposalValidation.reconstitute(validation),
        );
        await transaction.aiProposalValidation.upsert({
          where: { proposalId: validationData.proposalId },
          create: validationData,
          update: {
            schemaValid: validationData.schemaValid,
            catalogValid: validationData.catalogValid,
            nutritionValid: validationData.nutritionValid,
            restrictionsValid: validationData.restrictionsValid,
            inventoryValid: validationData.inventoryValid,
            budgetEvaluated: validationData.budgetEvaluated,
            warnings: validationData.warnings,
            errors: validationData.errors,
            validatedAt: validationData.validatedAt,
          },
        });
      }
    });
  }

  async saveValidation(validation: AiProposalValidation): Promise<void> {
    const data = PrismaAiProposalValidationMapper.toPersistence(validation);
    await this.prisma.aiProposalValidation.upsert({
      where: { proposalId: data.proposalId },
      create: data,
      update: {
        schemaValid: data.schemaValid,
        catalogValid: data.catalogValid,
        nutritionValid: data.nutritionValid,
        restrictionsValid: data.restrictionsValid,
        inventoryValid: data.inventoryValid,
        budgetEvaluated: data.budgetEvaluated,
        warnings: data.warnings,
        errors: data.errors,
        validatedAt: data.validatedAt,
      },
    });
  }

  async saveDecision(decision: AiProposalDecision): Promise<void> {
    const data = PrismaAiProposalDecisionMapper.toPersistence(decision);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.aiProposalDecision.create({ data });
      const status = decisionStatus(decision);
      if (status) {
        await transaction.aiGeneratedProposal.update({
          where: { id: data.proposalId },
          data: { status },
        });
      }
    });
  }

  async listByHousehold(
    householdId: string,
    filters: AiProposalFilters,
  ): Promise<PaginatedAiProposals> {
    const where: Prisma.AiGeneratedProposalWhereInput = {
      request: {
        householdId,
        ...(filters.proposalType ? { proposalType: filters.proposalType } : {}),
      },
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            generatedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.aiGeneratedProposal.findMany({
        where,
        include: aiGeneratedProposalInclude,
        orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.aiGeneratedProposal.count({ where }),
    ]);

    return {
      items: records.map((record) => PrismaAiProposalMapper.toDomain(record)),
      page: filters.page,
      limit: filters.limit,
      total,
    };
  }
}

function decisionStatus(
  decision: AiProposalDecision,
): 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED' | null {
  switch (decision.decision) {
    case 'ACCEPT':
      return 'ACCEPTED';
    case 'ACCEPT_WITH_CHANGES':
      return 'PARTIALLY_ACCEPTED';
    case 'REJECT':
      return 'REJECTED';
    default:
      return null;
  }
}
