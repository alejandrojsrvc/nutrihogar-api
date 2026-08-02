import {
  AiProposalBlockingErrorsError,
  AiProposalDecisionAlreadyRecordedError,
  AiProposalExpiredError,
  AiProposalValidationRequiredError,
  InvalidAiProposalTransitionError,
} from '../errors/ai-recommendation.errors';
import { AiGeneratedProposal } from './ai-generated-proposal';
import { AiProposalValidation } from './ai-proposal-validation';
import { AiGenerationRequest } from './ai-generation-request';

describe('AI recommendation domain', () => {
  it('creates a request and controls generation transitions', () => {
    const request = AiGenerationRequest.create({
      id: 'request-1',
      householdId: 'household-1',
      adultProfileIds: ['adult-1'],
      proposalType: 'WEEKLY_PLAN',
      contextVersion: 'context-v1',
      promptVersion: 'prompt-v1',
      requestedBy: 'user-1',
      requestedAt: date('2026-08-01T12:00:00.000Z'),
    });

    expect(request.status).toBe('REQUESTED');
    request.markGenerated();
    expect(request.status).toBe('GENERATED');
    expect(() => request.markFailed('AI_PROVIDER_TIMEOUT')).toThrow(
      InvalidAiProposalTransitionError,
    );
  });

  it('does not accept a proposal before validation or with blocking errors', () => {
    const proposal = createProposal();
    const decision = () =>
      proposal.accept({ decidedBy: 'user-1', decidedAt: date('2026-08-01T12:00:00.000Z') });

    expect(decision).toThrow(AiProposalValidationRequiredError);

    proposal.attachValidation(validation({ blocking: true }));
    expect(decision).toThrow(AiProposalBlockingErrorsError);
  });

  it('accepts a validated proposal', () => {
    const proposal = createProposal();
    proposal.attachValidation(validation({ blocking: false }));

    expect(() =>
      proposal.accept({ decidedBy: 'user-1', decidedAt: date('2026-08-01T12:00:00.000Z') }),
    ).not.toThrow();
    expect(proposal.status).toBe('ACCEPTED');
  });

  it('preserves original and edited payloads separately and records partial acceptance', () => {
    const original = { days: [{ meal: 'recipe-1' }] };
    const edited = { days: [{ meal: 'recipe-2' }] };
    const proposal = createProposal(original);
    proposal.attachValidation(validation({ blocking: false }));
    const decision = proposal.acceptPartially({
      selectedItems: ['day-1'],
      editedPayload: edited,
      decidedBy: 'user-1',
      decidedAt: date('2026-08-01T12:00:00.000Z'),
    });

    expect(proposal.structuredPayload).toEqual(original);
    expect(decision.editedPayload).toEqual(edited);
    expect(proposal.status).toBe('PARTIALLY_ACCEPTED');
  });

  it('rejects duplicate decisions and expired proposals', () => {
    const proposal = createProposal(undefined, date('2026-08-01T12:00:00.000Z'));
    proposal.attachValidation(validation({ blocking: false }));
    proposal.reject({ decidedBy: 'user-1', decidedAt: date('2026-08-01T12:00:00.000Z') });

    expect(() =>
      proposal.reject({ decidedBy: 'user-1', decidedAt: date('2026-08-01T12:01:00.000Z') }),
    ).toThrow(AiProposalDecisionAlreadyRecordedError);

    const expired = createProposal(undefined, date('2026-08-01T12:00:00.000Z'));
    expired.expire(date('2026-08-01T12:00:01.000Z'));
    expect(() =>
      expired.accept({ decidedBy: 'user-1', decidedAt: date('2026-08-01T12:00:01.000Z') }),
    ).toThrow(AiProposalExpiredError);
  });
});

function createProposal(
  structuredPayload: Record<string, unknown> = { days: [] },
  expiresAt: Date | null = null,
): AiGeneratedProposal {
  return AiGeneratedProposal.register({
    id: 'proposal-1',
    requestId: 'request-1',
    provider: 'provider-1',
    model: 'model-1',
    structuredPayload,
    rawResponseReference: null,
    generatedAt: date('2026-08-01T11:00:00.000Z'),
    expiresAt,
  });
}

function validation(input: { blocking: boolean }): AiProposalValidation {
  return AiProposalValidation.create({
    id: `validation-${input.blocking ? 'blocking' : 'valid'}`,
    proposalId: 'proposal-1',
    schemaValid: true,
    catalogValid: !input.blocking,
    nutritionValid: true,
    restrictionsValid: !input.blocking,
    inventoryValid: true,
    budgetEvaluated: false,
    errors: input.blocking
      ? [{ code: 'RESTRICTED_FOOD', severity: 'BLOCKING', message: 'Food is restricted.' }]
      : [],
    validatedAt: date('2026-08-01T11:30:00.000Z'),
  });
}

function date(value: string): Date {
  return new Date(value);
}
