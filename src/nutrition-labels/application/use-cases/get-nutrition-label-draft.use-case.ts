import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { NutritionLabelAccessDeniedError } from '../errors/nutrition-label.errors';
import { NutritionLabelDraftRepository } from '../ports/nutrition-label-draft.repository';

export const GET_NUTRITION_LABEL_DRAFT_USE_CASE = Symbol('GetNutritionLabelDraftUseCase');

export class GetNutritionLabelDraftUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly drafts: NutritionLabelDraftRepository,
  ) {}

  async execute(actorId: string, householdId: string, draftId: string) {
    const access = await this.households.findAccess(actorId, householdId);
    if (!access || access.status !== 'ACTIVE') throw new NutritionLabelAccessDeniedError();

    const draft = await this.drafts.findById(draftId, householdId);
    if (!draft) return null;
    return draft;
  }
}
