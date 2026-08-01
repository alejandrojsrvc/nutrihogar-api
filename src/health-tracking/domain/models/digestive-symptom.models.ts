import {
  DigestiveSymptomTypeValue,
  SymptomFoodLinkSourceValue,
  SymptomStatusValue,
} from '../value-objects/digestive-symptom.value-objects';

export type SymptomSnapshot = Readonly<Record<string, unknown>>;

export interface SymptomMealLinkProps {
  mealId: string;
}

export interface SymptomFoodLinkProps {
  foodId: string;
  source: SymptomFoodLinkSourceValue;
  mealId: string | null;
  snapshot: SymptomSnapshot | null;
}

export interface DigestiveSymptomEntryProps {
  id: string;
  adultProfileId: string;
  type: DigestiveSymptomTypeValue;
  name: string | null;
  intensity: number;
  startAt: Date;
  endAt: Date | null;
  status: SymptomStatusValue;
  correctedFromId: string | null;
  mealLinks: SymptomMealLinkProps[];
  foodLinks: SymptomFoodLinkProps[];
}
