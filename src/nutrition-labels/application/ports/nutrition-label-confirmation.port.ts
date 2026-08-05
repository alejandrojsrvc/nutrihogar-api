import { NutritionLabelBaseUnit } from '../../domain/models/nutrition-label-draft';

export const NUTRITION_LABEL_CONFIRMATION = Symbol('NutritionLabelConfirmation');

export interface ConfirmedNutrientInput {
  code: string;
  normalizedAmount: string;
}

export interface ConfirmNutritionLabelTransactionInput {
  draftId: string;
  householdId: string;
  actorId: string;
  targetFoodId: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  categoryId: string;
  preparationState: 'RAW' | 'COOKED' | 'READY_TO_EAT' | 'NOT_APPLICABLE';
  packageQuantity: string;
  packageUnit: NutritionLabelBaseUnit;
  minimumQuantity: string | null;
  location: string | null;
  expiresAt: Date | null;
  nutrients: ConfirmedNutrientInput[];
  serving: {
    name: string;
    quantity: string;
    unit: string;
    equivalentGrams: string | null;
    equivalentMilliliters: string | null;
  };
  now: Date;
}

export interface NutritionLabelConfirmationResult {
  food: {
    id: string;
    householdId: string;
    name: string;
    brand: string | null;
    description: string | null;
    categoryId: string;
    category: {
      id: string;
      code: string;
      name: string;
      displayOrder: number;
    };
    foodType: 'CUSTOM' | 'COMMERCIAL';
    preparationState: ConfirmNutritionLabelTransactionInput['preparationState'];
    referenceQuantity: number;
    referenceUnit: NutritionLabelBaseUnit;
    source: 'NUTRITION_LABEL_OCR';
    sourceReference: string | null;
    confidenceLevel: 'USER_PROVIDED';
    isGlobal: boolean;
    nutrients: Array<{
      id: string;
      nutrientDefinition: {
        id: string;
        code: string;
        name: string;
        unit: string;
        group: string;
        displayOrder: number;
        isRequired: boolean;
      };
      amount: number;
    }>;
    servings: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      equivalentGrams: number | null;
      equivalentMilliliters: number | null;
    }>;
    aliases: string[];
  };
  inventory: {
    id: string;
    currentQuantity: string;
    unit: NutritionLabelBaseUnit;
    minimumQuantity: string | null;
    location: string | null;
    expiresAt: Date | null;
    status: 'ACTIVE';
  };
}

export interface NutritionLabelConfirmationPort {
  confirm(input: ConfirmNutritionLabelTransactionInput): Promise<NutritionLabelConfirmationResult>;
}
