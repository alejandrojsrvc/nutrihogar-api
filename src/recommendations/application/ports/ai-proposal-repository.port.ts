import type { AiGeneratedProposal } from '../../domain/entities/ai-generated-proposal';
import type { AiGenerationRequest } from '../../domain/entities/ai-generation-request';
import type { AiProposalDecision } from '../../domain/entities/ai-proposal-decision';
import type { AiProposalValidation } from '../../domain/entities/ai-proposal-validation';
import type { AiGeneratedProposalId } from '../../domain/value-objects/ai-recommendation.value-objects';
import type {
  AiProposalStatus,
  AiProposalType,
} from '../../domain/models/ai-recommendation.models';

export const AI_PROPOSAL_REPOSITORY = Symbol('AiProposalRepository');

export interface AiProposalFilters {
  proposalType?: AiProposalType;
  status?: AiProposalStatus;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedAiProposals {
  items: AiGeneratedProposal[];
  page: number;
  limit: number;
  total: number;
}

export interface AiProposalRepository {
  findById(id: AiGeneratedProposalId): Promise<AiGeneratedProposal | null>;
  findByIdForHousehold(
    id: AiGeneratedProposalId,
    householdId: string,
  ): Promise<AiGeneratedProposal | null>;
  saveRequest(request: AiGenerationRequest): Promise<void>;
  saveProposal(proposal: AiGeneratedProposal): Promise<void>;
  saveValidation(validation: AiProposalValidation): Promise<void>;
  saveDecision(decision: AiProposalDecision): Promise<void>;
  listByHousehold(householdId: string, filters: AiProposalFilters): Promise<PaginatedAiProposals>;
}
