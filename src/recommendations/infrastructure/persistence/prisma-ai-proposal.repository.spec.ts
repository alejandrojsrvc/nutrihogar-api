/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { PrismaService } from '../../../database/prisma.service';
import { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';
import { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import { AiProposalValidation } from '../../domain/entities/ai-proposal-validation';
import { PrismaAiProposalRepository } from './prisma-ai-proposal.repository';

describe('PrismaAiProposalRepository', () => {
  it('saves a request and its adult relations', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const repository = new PrismaAiProposalRepository({
      aiGenerationRequest: { upsert },
    } as unknown as PrismaService);

    await repository.saveRequest(createRequest());

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-1' },
        create: expect.objectContaining({
          householdId: 'household-1',
          status: 'REQUESTED',
          adults: { create: [{ adultProfileId: 'adult-1' }] },
        }),
      }),
    );
  });

  it('saves a proposal and validation atomically', async () => {
    const upsertProposal = jest.fn().mockResolvedValue(undefined);
    const upsertValidation = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        aiGeneratedProposal: { upsert: upsertProposal },
        aiProposalValidation: { upsert: upsertValidation },
      }),
    );
    const repository = new PrismaAiProposalRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const proposal = createProposal();
    proposal.attachValidation(createValidation());

    await repository.saveProposal(proposal);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsertProposal).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proposal-1' } }),
    );
    expect(upsertValidation).toHaveBeenCalledWith(
      expect.objectContaining({ where: { proposalId: 'proposal-1' } }),
    );
  });

  it('filters proposals by household and paginates reconstructed aggregates', async () => {
    const findMany = jest.fn().mockResolvedValue([createRecord('household-1')]);
    const count = jest.fn().mockResolvedValue(1);
    const repository = new PrismaAiProposalRepository({
      aiGeneratedProposal: { findMany, count },
    } as unknown as PrismaService);

    const result = await repository.listByHousehold('household-1', {
      proposalType: 'WEEKLY_PLAN',
      page: 2,
      limit: 5,
    });

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        request: { householdId: 'household-1', proposalType: 'WEEKLY_PLAN' },
      },
      skip: 5,
      take: 5,
    });
    expect(result.items[0]).toBeInstanceOf(AiGeneratedProposal);
    expect(result.items[0]?.id).toBe('proposal-1');
    expect(result.total).toBe(1);
  });

  it('can load a proposal only when it belongs to the requested household', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new PrismaAiProposalRepository({
      aiGeneratedProposal: { findFirst },
    } as unknown as PrismaService);

    const result = await repository.findByIdForHousehold({ value: 'proposal-1' }, 'household-2');

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'proposal-1', request: { householdId: 'household-2' } },
      }),
    );
  });

  it('persists a decision and updates the proposal status atomically', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn((callback: (client: unknown) => unknown) =>
      callback({
        aiProposalDecision: { create },
        aiGeneratedProposal: { update },
      }),
    );
    const repository = new PrismaAiProposalRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const proposal = createProposal();
    proposal.attachValidation(createValidation());
    const decision = proposal.accept({
      decidedBy: 'user-1',
      decidedAt: date('2026-08-01T12:00:00.000Z'),
    });

    await repository.saveDecision(decision);

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ proposalId: 'proposal-1' }),
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'proposal-1' },
      data: { status: 'ACCEPTED' },
    });
  });
});

function createRequest(): AiGenerationRequest {
  return AiGenerationRequest.create({
    id: 'request-1',
    householdId: 'household-1',
    adultProfileIds: ['adult-1'],
    proposalType: 'WEEKLY_PLAN',
    contextVersion: 'context-v1',
    promptVersion: 'prompt-v1',
    requestedBy: 'user-1',
    requestedAt: date('2026-08-01T11:00:00.000Z'),
  });
}

function createProposal(): AiGeneratedProposal {
  return AiGeneratedProposal.register({
    id: 'proposal-1',
    requestId: 'request-1',
    provider: 'provider-1',
    model: 'model-1',
    structuredPayload: { schemaVersion: 'v1', days: [] },
    rawResponseReference: null,
    generatedAt: date('2026-08-01T11:30:00.000Z'),
    expiresAt: null,
  });
}

function createValidation(): AiProposalValidation {
  return AiProposalValidation.create({
    id: 'validation-1',
    proposalId: 'proposal-1',
    schemaValid: true,
    catalogValid: true,
    nutritionValid: true,
    restrictionsValid: true,
    inventoryValid: true,
    budgetEvaluated: false,
    warnings: [],
    errors: [],
    validatedAt: date('2026-08-01T11:45:00.000Z'),
  });
}

function createRecord(householdId: string) {
  return {
    id: 'proposal-1',
    requestId: 'request-1',
    provider: 'provider-1',
    model: 'model-1',
    structuredPayload: { schemaVersion: 'v1', days: [] },
    rawResponseReference: null,
    status: 'GENERATED',
    generatedAt: date('2026-08-01T11:30:00.000Z'),
    expiresAt: null,
    inputTokenCount: null,
    outputTokenCount: null,
    estimatedCost: null,
    latencyMilliseconds: null,
    correlationId: null,
    request: { householdId },
    validation: null,
    decision: null,
  };
}

function date(value: string): Date {
  return new Date(value);
}
