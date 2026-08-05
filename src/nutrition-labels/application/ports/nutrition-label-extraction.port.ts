import { StructuredNutritionLabelExtraction } from '../../domain/models/nutrition-label-draft';

export const NUTRITION_LABEL_EXTRACTION = Symbol('NutritionLabelExtraction');

export interface NutritionLabelExtractionPort {
  extract(input: {
    content: Buffer;
    contentType: string;
  }): Promise<StructuredNutritionLabelExtraction>;
}
