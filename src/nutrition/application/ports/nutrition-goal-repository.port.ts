import Decimal from 'decimal.js';
import {
  CalculationSnapshot,
  NutritionGoalSuggestionView,
  NutritionGoalView,
  NutritionValues,
} from '../../domain/models/nutrition-goal.models';

export const NUTRITION_GOAL_REPOSITORY = Symbol('NutritionGoalRepository');
export const NUTRITION_GOAL_UNIT_OF_WORK = Symbol('NutritionGoalUnitOfWork');

export interface NutritionGoalRepository {
  canAccessProfile(actorId: string, adultProfileId: string): Promise<boolean>;
  findSuggestionById(suggestionId: string): Promise<NutritionGoalSuggestionView | null>;
  findCurrentByProfile(adultProfileId: string): Promise<NutritionGoalView | null>;
  listByProfile(adultProfileId: string): Promise<NutritionGoalView[]>;
}

export interface CreateNutritionGoalSuggestionInput {
  adultProfileId: string;
  calculationMethod: string;
  calculationInput: CalculationSnapshot;
  bmr: Decimal;
  tdee: Decimal;
  values: NutritionValues;
  createdAt: Date;
  expiresAt: Date;
}

export interface ConfirmNutritionGoalSuggestionInput {
  suggestionId: string;
  adultProfileId: string;
  confirmedById: string;
  confirmedAt: Date;
  values: NutritionValues;
  goalType: string;
  calculationMethod: string;
  calculationInput: CalculationSnapshot;
}

export interface NutritionGoalUnitOfWork {
  createSuggestion(input: CreateNutritionGoalSuggestionInput): Promise<NutritionGoalSuggestionView>;
  confirmSuggestion(input: ConfirmNutritionGoalSuggestionInput): Promise<NutritionGoalView | null>;
  rejectSuggestion(input: RejectNutritionGoalSuggestionInput): Promise<boolean>;
  expireSuggestion(suggestionId: string): Promise<void>;
}

export interface RejectNutritionGoalSuggestionInput {
  suggestionId: string;
  rejectedAt: Date;
}
