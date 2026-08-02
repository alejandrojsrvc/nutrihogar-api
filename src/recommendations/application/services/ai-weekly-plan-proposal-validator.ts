import { AiProposalValidation } from '../../domain/entities/ai-proposal-validation';

export interface WeeklyPlanValidationInput {
  proposalId: string;
  payload: Record<string, unknown>;
  weekStart: string;
  mealTypes: string[];
  adultProfileIds: string[];
  validatedAt: Date;
}

export class AiWeeklyPlanProposalValidator {
  validate(input: WeeklyPlanValidationInput): AiProposalValidation {
    const errors = [];
    const warnings = [];
    const days = input.payload.days;
    if (!Array.isArray(days)) {
      errors.push(message('INVALID_DAYS', 'Proposal days must be an array.'));
    }
    if (!input.mealTypes.length || input.mealTypes.some((type) => !VALID_MEAL_TYPES.has(type))) {
      errors.push(message('INVALID_MEAL_TYPES', 'At least one meal type is required.'));
    }
    const payloadAdultIds = readAdultIds(input.payload);
    for (const adultId of payloadAdultIds) {
      if (!input.adultProfileIds.includes(adultId)) {
        errors.push(
          message('PARTICIPANT_OUTSIDE_HOUSEHOLD', 'Participant does not belong to the household.'),
        );
      }
    }
    for (const day of Array.isArray(days) ? days : []) {
      if (!isObject(day) || typeof day.date !== 'string') {
        errors.push(message('INVALID_DAY', 'Every proposal day must have a date.'));
        continue;
      }
      if (!isInRequestedWeek(day.date, input.weekStart)) {
        errors.push(message('DATE_OUTSIDE_WEEK', 'Proposal day is outside the requested week.'));
      }
      if (!Array.isArray(day.meals)) {
        errors.push(message('INVALID_MEALS', 'Every proposal day must contain meals.'));
        continue;
      }
      for (const meal of day.meals) {
        if (!isObject(meal) || typeof meal.type !== 'string' || !VALID_MEAL_TYPES.has(meal.type)) {
          errors.push(message('INVALID_MEAL_TYPE', 'Meal type is invalid.'));
          continue;
        }
        if (
          meal.quantity !== undefined &&
          (typeof meal.quantity !== 'number' ||
            !Number.isFinite(meal.quantity) ||
            meal.quantity <= 0)
        ) {
          errors.push(message('INVALID_QUANTITY', 'Meal quantities must be positive.'));
        }
        if (typeof meal.quantity === 'number' && meal.quantity > 2000) {
          warnings.push({
            code: 'EXTREME_PORTION',
            severity: 'WARNING' as const,
            message: 'The proposed portion is unusually large.',
          });
        }
      }
    }
    return AiProposalValidation.create({
      id: crypto.randomUUID(),
      proposalId: input.proposalId,
      schemaValid: errors.length === 0,
      catalogValid: true,
      nutritionValid: true,
      restrictionsValid: true,
      inventoryValid: true,
      budgetEvaluated: false,
      warnings,
      errors,
      validatedAt: input.validatedAt,
    });
  }
}

const VALID_MEAL_TYPES = new Set(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'EXTRA']);

function isInRequestedWeek(value: string, weekStart: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || Number.isNaN(start.getTime())) return false;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return date >= start && date <= end;
}

function readAdultIds(payload: Record<string, unknown>): string[] {
  if (!Array.isArray(payload.adultProfileIds)) return [];
  return payload.adultProfileIds.filter((value): value is string => typeof value === 'string');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function message(code: string, text: string) {
  return { code, severity: 'BLOCKING' as const, message: text };
}
