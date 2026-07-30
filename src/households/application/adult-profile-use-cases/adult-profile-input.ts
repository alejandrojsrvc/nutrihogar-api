import { DietaryRestrictionInput } from '../adult-profile-models/adult-profile-view';

export function normalizeDietaryRestrictions(
  restrictions: DietaryRestrictionInput[],
): DietaryRestrictionInput[] {
  return restrictions.map((restriction) => ({
    type: restriction.type,
    name: restriction.name.trim(),
    severity: normalizeOptionalText(restriction.severity),
    notes: normalizeOptionalText(restriction.notes),
  }));
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
