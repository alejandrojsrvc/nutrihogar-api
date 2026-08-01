import { randomUUID } from 'node:crypto';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { MealRepository } from '../../../meal-tracking/application/ports/meal-repository.port';
import { NutritionFoodRepository } from '../../../nutrition/application/ports/nutrition-food-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import {
  DigestiveSymptomTypeValue,
  SymptomFoodLinkSourceValue,
  SymptomStatusValue,
} from '../../domain/value-objects/digestive-symptom.value-objects';
import {
  DigestiveSymptomRepository,
  DigestiveSymptomListFilters,
} from '../ports/digestive-symptom-repository.port';
import {
  DigestiveSymptomAccessDeniedError,
  DigestiveSymptomEntryNotFoundError,
  DigestiveSymptomFoodNotAvailableError,
  DigestiveSymptomFoodNotInMealError,
  DigestiveSymptomMealNotFoundError,
  DigestiveSymptomCorrectionDeniedError,
} from '../errors/digestive-symptom-application.errors';

export const REGISTER_DIGESTIVE_SYMPTOM_USE_CASE = Symbol('RegisterDigestiveSymptomUseCase');
export const RESOLVE_DIGESTIVE_SYMPTOM_USE_CASE = Symbol('ResolveDigestiveSymptomUseCase');
export const CORRECT_DIGESTIVE_SYMPTOM_USE_CASE = Symbol('CorrectDigestiveSymptomUseCase');
export const GET_DIGESTIVE_SYMPTOM_QUERY = Symbol('GetDigestiveSymptomQuery');
export const LIST_DIGESTIVE_SYMPTOMS_QUERY = Symbol('ListDigestiveSymptomsQuery');
export const GET_RECENT_MEALS_FOR_SYMPTOM_LINK_QUERY = Symbol('GetRecentMealsForSymptomLinkQuery');

type Dependencies = {
  profiles: AdultProfileRepository;
  households: HouseholdRepository;
  meals: MealRepository;
  foods: NutritionFoodRepository;
  clock: Clock;
};
async function access(deps: Dependencies, actorId: string, profileId: string) {
  const profile = await deps.profiles.findActiveById(profileId);
  if (!profile) throw new DigestiveSymptomEntryNotFoundError();
  const membership = await deps.households.findAccess(actorId, profile.householdId);
  if (!membership || membership.status !== 'ACTIVE') throw new DigestiveSymptomAccessDeniedError();
  return { profile, admin: membership.role === 'ADMIN' };
}
function paging(page = 1, limit = 20) {
  return { page: Math.max(1, page), limit: Math.min(100, Math.max(1, limit)) };
}
function validDate(value?: string) {
  if (!value) return undefined;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? undefined : result;
}

type LinkInput = {
  mealId?: string;
  foodId?: string;
  source?: SymptomFoodLinkSourceValue;
  snapshot?: Record<string, unknown> | null;
};
async function validateLinks(
  deps: Dependencies,
  actorId: string,
  profileId: string,
  links: LinkInput[],
) {
  const { profile } = await access(deps, actorId, profileId);
  const meals = new Map<string, Awaited<ReturnType<MealRepository['findById']>>>();
  for (const link of links) {
    if (link.mealId) {
      const meal = meals.get(link.mealId) ?? (await deps.meals.findById(link.mealId));
      meals.set(link.mealId, meal);
      if (
        !meal ||
        meal.adultProfileId !== profileId ||
        meal.householdId !== profile.householdId ||
        meal.status !== 'CONFIRMED'
      )
        throw new DigestiveSymptomMealNotFoundError();
      if (
        link.source === 'FOOD_FROM_MEAL' &&
        link.foodId &&
        !meal.items.some((item) => item.foodId === link.foodId)
      )
        throw new DigestiveSymptomFoodNotInMealError();
    }
    if (link.foodId) {
      const food = await deps.foods.findVisibleById({
        actorId,
        householdId: profile.householdId,
        foodId: link.foodId,
      });
      if (!food) throw new DigestiveSymptomFoodNotAvailableError();
    }
  }
  return profile;
}

export class RegisterDigestiveSymptomUseCase {
  constructor(
    private readonly symptoms: DigestiveSymptomRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    type: DigestiveSymptomTypeValue;
    name?: string | null;
    intensity: number;
    startAt: Date | string;
    endAt?: Date | string | null;
    notes?: string | null;
    mealIds?: string[];
    foodLinks?: LinkInput[];
  }) {
    const profile = await validateLinks(this.deps, input.actorId, input.adultProfileId, [
      ...(input.mealIds ?? []).map((mealId) => ({ mealId })),
      ...(input.foodLinks ?? []),
    ]);
    const membership = await this.deps.households.findAccess(input.actorId, profile.householdId);
    if (profile.userId !== input.actorId && membership?.role !== 'ADMIN')
      throw new DigestiveSymptomAccessDeniedError();
    const symptom = DigestiveSymptomEntry.create({
      ...input,
      id: randomUUID(),
      adultProfileId: profile.id,
      now: this.deps.clock.now(),
    });
    for (const mealId of input.mealIds ?? []) symptom.linkMeal(mealId);
    for (const link of input.foodLinks ?? [])
      if (link.foodId && link.source)
        symptom.linkFood(
          link as {
            foodId: string;
            source: SymptomFoodLinkSourceValue;
            mealId?: string | null;
            snapshot?: Record<string, unknown> | null;
          },
        );
    return this.symptoms.save(symptom);
  }
}

export class ResolveDigestiveSymptomUseCase {
  constructor(
    private readonly symptoms: DigestiveSymptomRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(actorId: string, symptomId: string) {
    const symptom = await this.symptoms.findById(symptomId);
    if (!symptom) throw new DigestiveSymptomEntryNotFoundError();
    await access(this.deps, actorId, symptom.toProps().adultProfileId);
    symptom.resolve();
    return this.symptoms.save(symptom);
  }
}

export class CorrectDigestiveSymptomUseCase {
  constructor(
    private readonly symptoms: DigestiveSymptomRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    symptomId: string;
    type: DigestiveSymptomTypeValue;
    name?: string | null;
    intensity: number;
    startAt: Date | string;
    endAt?: Date | string | null;
    notes?: string | null;
    mealIds?: string[];
    foodLinks?: LinkInput[];
  }) {
    const original = await this.symptoms.findById(input.symptomId);
    if (!original) throw new DigestiveSymptomEntryNotFoundError();
    const { profile, admin } = await access(
      this.deps,
      input.actorId,
      original.toProps().adultProfileId,
    );
    if (!admin && profile.userId !== input.actorId)
      throw new DigestiveSymptomCorrectionDeniedError();
    await validateLinks(this.deps, input.actorId, profile.id, [
      ...(input.mealIds ?? []).map((mealId) => ({ mealId })),
      ...(input.foodLinks ?? []),
    ]);
    const corrected = original.correct({ ...input, id: randomUUID(), now: this.deps.clock.now() });
    for (const mealId of input.mealIds ?? []) corrected.linkMeal(mealId);
    for (const link of input.foodLinks ?? [])
      if (link.foodId && link.source)
        corrected.linkFood(
          link as {
            foodId: string;
            source: SymptomFoodLinkSourceValue;
            mealId?: string | null;
            snapshot?: Record<string, unknown> | null;
          },
        );
    if (this.symptoms.saveCorrection) return this.symptoms.saveCorrection(original, corrected);
    await this.symptoms.save(original);
    return this.symptoms.save(corrected);
  }
}

export class GetDigestiveSymptomQuery {
  constructor(
    private readonly symptoms: DigestiveSymptomRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(actorId: string, symptomId: string) {
    const symptom = await this.symptoms.findById(symptomId);
    if (!symptom) throw new DigestiveSymptomEntryNotFoundError();
    await access(this.deps, actorId, symptom.toProps().adultProfileId);
    return symptom;
  }
}

export class ListDigestiveSymptomsQuery {
  constructor(
    private readonly symptoms: DigestiveSymptomRepository,
    private readonly deps: Dependencies,
  ) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    type?: DigestiveSymptomTypeValue;
    status?: SymptomStatusValue;
    intensity?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    await access(this.deps, input.actorId, input.adultProfileId);
    const filters: DigestiveSymptomListFilters = {
      ...paging(input.page, input.limit),
      type: input.type,
      status: input.status,
      intensity: input.intensity,
      dateFrom: validDate(input.dateFrom),
      dateTo: validDate(input.dateTo),
    };
    return this.symptoms.listByAdult(input.adultProfileId, filters);
  }
}

export class GetRecentMealsForSymptomLinkQuery {
  constructor(private readonly deps: Dependencies) {}
  async execute(input: {
    actorId: string;
    adultProfileId: string;
    hours?: number;
    days?: number;
    page?: number;
    limit?: number;
  }) {
    const { profile } = await access(this.deps, input.actorId, input.adultProfileId);
    const durationMs = (input.hours ?? (input.days ?? 2) * 24) * 60 * 60 * 1000;
    const now = this.deps.clock.now();
    return {
      ...(await this.deps.meals.list({
        householdId: profile.householdId,
        adultProfileId: profile.id,
        dateFrom: new Date(now.getTime() - durationMs),
        dateTo: now,
        includeCancelled: false,
        ...paging(input.page, input.limit),
      })),
      disclaimer:
        'Los alimentos y comidas relacionados son hipótesis de registro y no demuestran causalidad médica.',
    };
  }
}
