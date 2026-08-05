import { NutritionLabelDraft } from '../../domain/models/nutrition-label-draft';

export const NUTRITION_LABEL_DRAFT_REPOSITORY = Symbol('NutritionLabelDraftRepository');

export interface CreateNutritionLabelDraftInput extends Omit<
  NutritionLabelDraft,
  'id' | 'status' | 'confirmedAt' | 'confirmedFoodId' | 'createdAt' | 'updatedAt'
> {
  now: Date;
}

export interface NutritionLabelDraftRepository {
  findUnexpiredByHash(
    householdId: string,
    hash: string,
    now: Date,
  ): Promise<NutritionLabelDraft | null>;
  findById(id: string, householdId: string): Promise<NutritionLabelDraft | null>;
  saveReplacingExpired(input: CreateNutritionLabelDraftInput): Promise<NutritionLabelDraft>;
}
