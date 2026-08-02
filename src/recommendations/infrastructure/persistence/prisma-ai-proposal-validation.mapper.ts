import type { Prisma } from '@prisma/client';
import { AiProposalValidation } from '../../domain/entities/ai-proposal-validation';
import type { AiProposalValidationProps } from '../../domain/models/ai-recommendation.models';

export const aiProposalValidationInclude = true;

export type PrismaAiProposalValidationRecord = Prisma.AiProposalValidationGetPayload<{
  select: {
    id: true;
    proposalId: true;
    schemaValid: true;
    catalogValid: true;
    nutritionValid: true;
    restrictionsValid: true;
    inventoryValid: true;
    budgetEvaluated: true;
    warnings: true;
    errors: true;
    validatedAt: true;
  };
}>;

export class PrismaAiProposalValidationMapper {
  static toPersistence(
    validation: AiProposalValidation,
  ): Prisma.AiProposalValidationUncheckedCreateInput {
    const props = validation.toProps();
    return {
      id: props.id,
      proposalId: props.proposalId,
      schemaValid: props.schemaValid,
      catalogValid: props.catalogValid,
      nutritionValid: props.nutritionValid,
      restrictionsValid: props.restrictionsValid,
      inventoryValid: props.inventoryValid,
      budgetEvaluated: props.budgetEvaluated,
      warnings: toInputJson(props.warnings),
      errors: toInputJson(props.errors),
      validatedAt: props.validatedAt,
    };
  }

  static toDomain(record: PrismaAiProposalValidationRecord): AiProposalValidation {
    const props: AiProposalValidationProps = {
      id: record.id,
      proposalId: record.proposalId,
      schemaValid: record.schemaValid,
      catalogValid: record.catalogValid,
      nutritionValid: record.nutritionValid,
      restrictionsValid: record.restrictionsValid,
      inventoryValid: record.inventoryValid,
      budgetEvaluated: record.budgetEvaluated,
      warnings: asMessages(record.warnings),
      errors: asMessages(record.errors),
      validatedAt: record.validatedAt,
    };
    return AiProposalValidation.reconstitute(props);
  }
}

function asMessages(value: Prisma.JsonValue): AiProposalValidationProps['warnings'] {
  if (!Array.isArray(value)) throw new Error('AI validation messages must be a JSON array.');
  return value as unknown as AiProposalValidationProps['warnings'];
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
