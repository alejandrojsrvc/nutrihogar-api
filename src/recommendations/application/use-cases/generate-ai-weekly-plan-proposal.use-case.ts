import type { AiRateLimiter } from '../ports/ai-rate-limiter.port';
import type { AiProposalRepository } from '../ports/ai-proposal-repository.port';
import type { WeeklyPlanContextBuilder } from '../ports/ai-context-builder.ports';
import type { WeeklyPlanGenerator } from '../ports/ai-generation.ports';
import { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';
import { AiWeeklyPlanProposalValidator } from '../services/ai-weekly-plan-proposal-validator';

export interface GenerateAiWeeklyPlanProposalCommand {
  actorId: string;
  householdId: string;
  weekStart: string;
  mealTypes: string[];
  adultProfileIds: string[];
  preferences: Record<string, unknown>;
}

export class GenerateAiWeeklyPlanProposalUseCase {
  constructor(
    private readonly contexts: WeeklyPlanContextBuilder,
    private readonly generator: WeeklyPlanGenerator,
    private readonly proposals: AiProposalRepository,
    private readonly rateLimiter: AiRateLimiter,
    private readonly validator: AiWeeklyPlanProposalValidator,
    private readonly config: { maxRequestsPerHousehold: number; windowMs: number },
  ) {}

  async execute(command: GenerateAiWeeklyPlanProposalCommand) {
    const rate = this.rateLimiter.consume({
      householdId: command.householdId,
      limit: this.config.maxRequestsPerHousehold,
      windowMs: this.config.windowMs,
    });
    if (!rate.allowed)
      throw new Error(`AI rate limit exceeded. Retry after ${rate.retryAfterSeconds} seconds.`);
    const context = await this.contexts.build(command);
    const request = AiGenerationRequest.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      adultProfileIds: command.adultProfileIds,
      proposalType: 'WEEKLY_PLAN',
      contextVersion: context.contextVersion,
      promptVersion: context.schemaVersion,
      requestedBy: command.actorId,
      requestedAt: new Date(),
    });
    const result = await this.generator.generate(context);
    request.markGenerated();
    const proposal = AiGeneratedProposal.register({
      id: crypto.randomUUID(),
      requestId: request.id,
      provider: result.metadata.provider,
      model: result.metadata.model,
      structuredPayload: result.payload,
      rawResponseReference: null,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const validation = this.validator.validate({
      proposalId: proposal.id,
      payload: result.payload,
      weekStart: command.weekStart,
      mealTypes: command.mealTypes,
      adultProfileIds: command.adultProfileIds,
      validatedAt: new Date(),
    });
    proposal.attachValidation(validation);
    if (!validation.hasBlockingErrors()) proposal.markReadyForReview();
    await this.proposals.saveRequest(request);
    await this.proposals.saveProposal(proposal);
    return proposal;
  }
}
