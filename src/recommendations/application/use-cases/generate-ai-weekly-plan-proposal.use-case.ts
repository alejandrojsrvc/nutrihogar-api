import type { AiRateLimiter } from '../ports/ai-rate-limiter.port';
import type { AiProposalRepository } from '../ports/ai-proposal-repository.port';
import type { WeeklyPlanContextBuilder } from '../ports/ai-context-builder.ports';
import type { WeeklyPlanGenerator } from '../ports/ai-generation.ports';
import { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';
import { AiProposalValidator } from '../services/ai-proposal-validator';

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
    private readonly validator: AiProposalValidator,
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
    await this.proposals.saveRequest(request);
    let result: Awaited<ReturnType<WeeklyPlanGenerator['generate']>>;
    try {
      result = await this.generator.generate(context);
    } catch (error) {
      request.markFailed(error instanceof Error ? 'AI_PROVIDER_FAILED' : 'AI_PROVIDER_ERROR');
      await this.proposals.saveRequest(request);
      throw error;
    }
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
    const validation = await this.validator.validate({
      proposalId: proposal.id,
      payload: result.payload,
      weekStart: command.weekStart,
      mealTypes: command.mealTypes,
      adultProfileIds: command.adultProfileIds,
      householdId: command.householdId,
      actorId: command.actorId,
      restrictions: readRestrictions(context),
      validatedAt: new Date(),
    });
    proposal.attachValidation(validation);
    if (!validation.hasBlockingErrors()) proposal.markReadyForReview();
    await this.proposals.saveProposal(proposal);
    return proposal;
  }
}

function readRestrictions(context: Record<string, unknown>): string[] {
  const adults: unknown[] = Array.isArray(context.adults) ? context.adults : [];
  return adults.flatMap((adult: unknown): string[] => {
    if (!adult || typeof adult !== 'object' || Array.isArray(adult)) return [];
    const candidate = adult as Record<string, unknown>;
    const restrictions = candidate.restrictions;
    if (!Array.isArray(restrictions)) return [];
    return restrictions.flatMap((restriction: unknown): string[] => {
      if (typeof restriction === 'string') return [restriction];
      if (restriction && typeof restriction === 'object' && !Array.isArray(restriction)) {
        const name = (restriction as Record<string, unknown>).name;
        if (typeof name === 'string') return [name];
      }
      return [];
    });
  });
}
