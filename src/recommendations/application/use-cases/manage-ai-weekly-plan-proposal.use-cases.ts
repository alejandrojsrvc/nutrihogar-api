import type { AiProposalRepository } from '../ports/ai-proposal-repository.port';
import { AiGeneratedProposalId } from '../../domain/value-objects/ai-recommendation.value-objects';
import { AiWeeklyPlanProposalValidator } from '../services/ai-weekly-plan-proposal-validator';

export class GetAiWeeklyPlanProposalQuery {
  constructor(private readonly proposals: AiProposalRepository) {}

  async execute(input: { householdId: string; proposalId: string }) {
    const proposal = await this.proposals.findByIdForHousehold(
      AiGeneratedProposalId.from(input.proposalId),
      input.householdId,
    );
    if (!proposal) throw new Error('AI proposal was not found.');
    proposal.expire(new Date());
    return proposal;
  }
}

export class UpdateAiWeeklyPlanProposalUseCase {
  constructor(
    private readonly proposals: AiProposalRepository,
    private readonly validator: AiWeeklyPlanProposalValidator,
  ) {}

  async execute(input: {
    householdId: string;
    proposalId: string;
    payload: Record<string, unknown>;
    mealTypes: string[];
    adultProfileIds: string[];
  }) {
    const proposal = await this.require(input.householdId, input.proposalId);
    const validation = this.validator.validate({
      proposalId: proposal.id,
      payload: input.payload,
      weekStart: readWeekStart(input.payload, proposal.structuredPayload),
      mealTypes: input.mealTypes,
      adultProfileIds: input.adultProfileIds,
      validatedAt: new Date(),
    });
    proposal.attachValidation(validation);
    if (!validation.hasBlockingErrors()) proposal.markReadyForReview();
    await this.proposals.saveProposal(proposal);
    return proposal;
  }

  private async require(householdId: string, proposalId: string) {
    const proposal = await this.proposals.findByIdForHousehold(
      AiGeneratedProposalId.from(proposalId),
      householdId,
    );
    if (!proposal) throw new Error('AI proposal was not found.');
    return proposal;
  }
}

export class RejectAiWeeklyPlanProposalUseCase {
  constructor(private readonly proposals: AiProposalRepository) {}

  async execute(input: {
    householdId: string;
    proposalId: string;
    actorId: string;
    reason?: string;
  }) {
    const proposal = await this.proposals.findByIdForHousehold(
      AiGeneratedProposalId.from(input.proposalId),
      input.householdId,
    );
    if (!proposal) throw new Error('AI proposal was not found.');
    const decision = proposal.reject({
      decidedBy: input.actorId,
      decidedAt: new Date(),
      reason: input.reason,
    });
    await this.proposals.saveDecision(decision);
    return proposal;
  }
}

function readWeekStart(
  payload: Record<string, unknown>,
  fallback: Record<string, unknown>,
): string {
  const value = payload.weekStart ?? fallback.weekStart;
  if (typeof value !== 'string' || !value.trim())
    throw new Error('AI proposal weekStart is required.');
  return value;
}
