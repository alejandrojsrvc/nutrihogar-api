export const AI_PROPOSAL_TYPES = [
  'WEEKLY_PLAN',
  'RECIPE',
  'FOOD_SUBSTITUTION',
  'PORTION',
  'MEAL_ADJUSTMENT',
] as const;

export type AiProposalType = (typeof AI_PROPOSAL_TYPES)[number];

export const AI_REQUEST_STATUSES = ['REQUESTED', 'GENERATED', 'FAILED'] as const;
export type AiGenerationRequestStatus = (typeof AI_REQUEST_STATUSES)[number];

export const AI_PROPOSAL_STATUSES = [
  'GENERATED',
  'VALIDATED',
  'REQUIRES_CHANGES',
  'READY_FOR_REVIEW',
  'ACCEPTED',
  'PARTIALLY_ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'FAILED',
] as const;

export type AiProposalStatus = (typeof AI_PROPOSAL_STATUSES)[number];

export const AI_DECISION_TYPES = [
  'ACCEPT',
  'ACCEPT_WITH_CHANGES',
  'REJECT',
  'REGENERATE',
  'POSTPONE',
] as const;

export type AiDecisionType = (typeof AI_DECISION_TYPES)[number];

export const VALIDATION_SEVERITIES = ['INFO', 'WARNING', 'BLOCKING'] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export interface StructuredPayload {
  readonly [key: string]: unknown;
}

export interface AiGenerationRequestProps {
  id: string;
  householdId: string;
  adultProfileIds: string[];
  proposalType: AiProposalType;
  contextVersion: string;
  promptVersion: string;
  requestedBy: string;
  requestedAt: Date;
  status: AiGenerationRequestStatus;
  failureCode: string | null;
}

export interface AiProposalValidationProps {
  id: string;
  proposalId: string;
  schemaValid: boolean;
  catalogValid: boolean;
  nutritionValid: boolean;
  restrictionsValid: boolean;
  inventoryValid: boolean;
  budgetEvaluated: boolean;
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  validatedAt: Date;
}

export interface ValidationMessage {
  code: string;
  severity: ValidationSeverity;
  message: string;
  itemReference?: string;
}

export interface AiProposalDecisionProps {
  id: string;
  proposalId: string;
  decision: AiDecisionType;
  selectedItems: string[];
  editedPayload: StructuredPayload | null;
  decidedBy: string;
  decidedAt: Date;
  reason: string | null;
}

export interface AiGeneratedProposalProps {
  id: string;
  requestId: string;
  provider: string;
  model: string;
  structuredPayload: StructuredPayload;
  rawResponseReference: string | null;
  status: AiProposalStatus;
  generatedAt: Date;
  expiresAt: Date | null;
  validation: AiProposalValidationProps | null;
  decision: AiProposalDecisionProps | null;
}
