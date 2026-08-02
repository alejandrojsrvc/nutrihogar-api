import { InvalidAiRecommendationError } from '../errors/ai-recommendation.errors';
import {
  AI_DECISION_TYPES,
  AI_PROPOSAL_TYPES,
  type AiDecisionType,
  type AiProposalType,
} from '../models/ai-recommendation.models';

abstract class RequiredValue {
  protected constructor(readonly value: string) {}

  protected static normalize(value: string, label: string): string {
    const normalized = value.trim();
    if (!normalized) throw new InvalidAiRecommendationError(`${label} is required.`);
    return normalized;
  }
}

export class AiGenerationRequestId extends RequiredValue {
  static from(value: string): AiGenerationRequestId {
    return new AiGenerationRequestId(RequiredValue.normalize(value, 'AI generation request id'));
  }
}

export class AiGeneratedProposalId extends RequiredValue {
  static from(value: string): AiGeneratedProposalId {
    return new AiGeneratedProposalId(RequiredValue.normalize(value, 'AI generated proposal id'));
  }
}

export class AiProposalDecisionId extends RequiredValue {
  static from(value: string): AiProposalDecisionId {
    return new AiProposalDecisionId(RequiredValue.normalize(value, 'AI proposal decision id'));
  }
}

export class AiProposalValidationId extends RequiredValue {
  static from(value: string): AiProposalValidationId {
    return new AiProposalValidationId(RequiredValue.normalize(value, 'AI proposal validation id'));
  }
}

export class AiProviderReference extends RequiredValue {
  static from(value: string): AiProviderReference {
    return new AiProviderReference(RequiredValue.normalize(value, 'AI provider'));
  }
}

export class AiModelReference extends RequiredValue {
  static from(value: string): AiModelReference {
    return new AiModelReference(RequiredValue.normalize(value, 'AI model'));
  }
}

export class AiPromptVersion extends RequiredValue {
  static from(value: string): AiPromptVersion {
    return new AiPromptVersion(RequiredValue.normalize(value, 'AI prompt version'));
  }
}

export class AiProposalTypeValue extends RequiredValue {
  private constructor(readonly value: AiProposalType) {
    super(value);
  }

  static from(value: string): AiProposalTypeValue {
    if (!(AI_PROPOSAL_TYPES as readonly string[]).includes(value)) {
      throw new InvalidAiRecommendationError('AI proposal type is invalid.');
    }
    return new AiProposalTypeValue(value as AiProposalType);
  }
}

export class AiDecisionTypeValue extends RequiredValue {
  private constructor(readonly value: AiDecisionType) {
    super(value);
  }

  static from(value: string): AiDecisionTypeValue {
    if (!(AI_DECISION_TYPES as readonly string[]).includes(value)) {
      throw new InvalidAiRecommendationError('AI decision type is invalid.');
    }
    return new AiDecisionTypeValue(value as AiDecisionType);
  }
}
