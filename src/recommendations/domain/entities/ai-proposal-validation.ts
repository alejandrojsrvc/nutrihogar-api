import { InvalidAiRecommendationError } from '../errors/ai-recommendation.errors';
import type {
  AiProposalValidationProps,
  ValidationMessage,
} from '../models/ai-recommendation.models';
import { AiProposalValidationId } from '../value-objects/ai-recommendation.value-objects';

export class AiProposalValidation {
  private constructor(private readonly props: AiProposalValidationProps) {}

  static create(
    input: Omit<AiProposalValidationProps, 'warnings' | 'errors'> & {
      warnings?: ValidationMessage[];
      errors?: ValidationMessage[];
    },
  ): AiProposalValidation {
    return new AiProposalValidation({
      ...input,
      id: AiProposalValidationId.from(input.id).value,
      proposalId: required(input.proposalId, 'Proposal id'),
      warnings: normalizeMessages(input.warnings ?? []),
      errors: normalizeMessages(input.errors ?? []),
      validatedAt: validDate(input.validatedAt),
    });
  }

  static reconstitute(props: AiProposalValidationProps): AiProposalValidation {
    return AiProposalValidation.create(props);
  }

  get id(): string {
    return this.props.id;
  }

  get proposalId(): string {
    return this.props.proposalId;
  }

  get schemaValid(): boolean {
    return this.props.schemaValid;
  }

  get catalogValid(): boolean {
    return this.props.catalogValid;
  }

  get nutritionValid(): boolean {
    return this.props.nutritionValid;
  }

  get restrictionsValid(): boolean {
    return this.props.restrictionsValid;
  }

  get inventoryValid(): boolean {
    return this.props.inventoryValid;
  }

  get budgetEvaluated(): boolean {
    return this.props.budgetEvaluated;
  }

  get warnings(): ValidationMessage[] {
    return this.props.warnings.map(copyMessage);
  }

  get errors(): ValidationMessage[] {
    return this.props.errors.map(copyMessage);
  }

  get validatedAt(): Date {
    return new Date(this.props.validatedAt);
  }

  hasBlockingErrors(): boolean {
    return this.props.errors.some((error) => error.severity === 'BLOCKING');
  }

  toProps(): AiProposalValidationProps {
    return {
      ...this.props,
      warnings: this.warnings,
      errors: this.errors,
      validatedAt: this.validatedAt,
    };
  }
}

function required(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new InvalidAiRecommendationError(`${label} is required.`);
  return normalized;
}

function validDate(value: Date): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new InvalidAiRecommendationError('Validation date is invalid.');
  return date;
}

function normalizeMessages(messages: ValidationMessage[]): ValidationMessage[] {
  return messages.map((message) => {
    const code = required(message.code, 'Validation code');
    const text = required(message.message, 'Validation message');
    if (!['INFO', 'WARNING', 'BLOCKING'].includes(message.severity)) {
      throw new InvalidAiRecommendationError('Validation severity is invalid.');
    }
    return {
      code,
      severity: message.severity,
      message: text,
      ...(message.itemReference
        ? { itemReference: required(message.itemReference, 'Item reference') }
        : {}),
    };
  });
}

function copyMessage(message: ValidationMessage): ValidationMessage {
  return { ...message };
}
