export const NUTRITION_LABEL_SCHEMA_VERSION = 'nutrition-label.v1' as const;

export const NUTRITION_LABEL_NUTRIENT_CODES = [
  'ENERGY_KCAL',
  'PROTEIN',
  'CARBOHYDRATE',
  'FAT',
  'SATURATED_FAT',
  'TRANS_FAT',
  'SUGAR',
  'FIBER',
  'SODIUM',
] as const;

export const REQUIRED_NUTRIENT_CODES = ['ENERGY_KCAL', 'PROTEIN', 'CARBOHYDRATE', 'FAT'] as const;

export type NutritionLabelNutrientCode = (typeof NUTRITION_LABEL_NUTRIENT_CODES)[number];
export type NutritionLabelBaseUnit = 'GRAM' | 'MILLILITER';
export type NutritionLabelDraftStatus = 'PENDING_REVIEW' | 'CONFIRMED';
export type NutritionLabelStructuredUnit = 'g' | 'ml';
export type NutritionLabelBasisType = 'PER_SERVING' | 'PER_100';

export interface StructuredNutritionLabelNutrients {
  energy_kcal: number | null;
  protein_g: number | null;
  total_fat_g: number | null;
  saturated_fat_g: number | null;
  trans_fat_g: number | null;
  carbohydrates_g: number | null;
  sugars_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
}

export interface StructuredNutritionLabelBasis {
  type: NutritionLabelBasisType | null;
  value: number | null;
  unit: NutritionLabelStructuredUnit | null;
}

export interface StructuredNutritionLabelDeclaration {
  basis: StructuredNutritionLabelBasis;
  nutrients: StructuredNutritionLabelNutrients;
}

export interface StructuredNutritionLabelExtraction {
  schema_version: typeof NUTRITION_LABEL_SCHEMA_VERSION;
  product_name: string | null;
  brand: string | null;
  net_content: {
    value: number | null;
    unit: NutritionLabelStructuredUnit | null;
  };
  serving_size: {
    description: string | null;
    value: number | null;
    unit: string | null;
  };
  servings_per_container: number | null;
  nutrition_declarations: StructuredNutritionLabelDeclaration[];
  ingredients: string[];
  allergens: {
    contains: string[];
    may_contain: string[];
  };
  warnings: string[];
  confidence: number | null;
  requires_review: boolean;
}

export interface NutritionLabelDraft {
  id: string;
  householdId: string;
  createdById: string;
  documentHash: string;
  status: NutritionLabelDraftStatus;
  name: string | null;
  brand: string | null;
  packageQuantity: string | null;
  packageUnit: NutritionLabelBaseUnit | null;
  extractedData: StructuredNutritionLabelExtraction;
  warnings: string[];
  missingFields: string[];
  rawText: string;
  confidence: number | null;
  expiresAt: Date;
  confirmedAt: Date | null;
  confirmedFoodId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
