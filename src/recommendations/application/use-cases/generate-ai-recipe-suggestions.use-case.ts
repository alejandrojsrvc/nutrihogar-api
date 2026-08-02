import type { AiRateLimiter } from '../ports/ai-rate-limiter.port';
import type { AiProposalRepository } from '../ports/ai-proposal-repository.port';
import type { RecipeSuggestionContextBuilder } from '../ports/ai-context-builder.ports';
import type { RecipeSuggestionProvider } from '../ports/ai-generation.ports';
import { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';

export interface GenerateAiRecipeSuggestionsCommand {
  actorId: string;
  householdId: string;
  mealType: string;
  adultProfileIds: string[];
  maximumPreparationMinutes: number | null;
  maximumSuggestions: number;
  prioritizeExpiringInventory: boolean;
}

export class GenerateAiRecipeSuggestionsUseCase {
  constructor(
    private readonly contexts: RecipeSuggestionContextBuilder,
    private readonly provider: RecipeSuggestionProvider,
    private readonly proposals: AiProposalRepository,
    private readonly rateLimiter: AiRateLimiter,
    private readonly config: { maxRequestsPerHousehold: number; windowMs: number },
  ) {}

  async execute(command: GenerateAiRecipeSuggestionsCommand) {
    const rate = this.rateLimiter.consume({
      householdId: command.householdId,
      limit: this.config.maxRequestsPerHousehold,
      windowMs: this.config.windowMs,
    });
    if (!rate.allowed)
      throw new Error(`AI rate limit exceeded. Retry after ${rate.retryAfterSeconds} seconds.`);
    const context = await this.contexts.build(command);
    const adultProfileIds = command.adultProfileIds.length
      ? command.adultProfileIds
      : readContextAdultIds(context);
    const request = AiGenerationRequest.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      adultProfileIds,
      proposalType: 'RECIPE',
      contextVersion: context.contextVersion,
      promptVersion: context.schemaVersion,
      requestedBy: command.actorId,
      requestedAt: new Date(),
    });
    await this.proposals.saveRequest(request);
    let result: Awaited<ReturnType<RecipeSuggestionProvider['suggest']>>;
    try {
      result = await this.provider.suggest(context);
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
    await this.proposals.saveProposal(proposal);
    return proposal;
  }
}

function readContextAdultIds(context: Record<string, unknown>): string[] {
  if (!Array.isArray(context.adults)) return [];
  return context.adults
    .filter(
      (adult): adult is Record<string, unknown> => typeof adult === 'object' && adult !== null,
    )
    .map((adult) => adult.id)
    .filter((id): id is string => typeof id === 'string');
}
