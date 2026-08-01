import { InvalidMealPlanningError } from '../errors/meal-planning.errors';

abstract class Identifier {
  protected constructor(readonly value: string) {}

  static normalize(value: string, label: string): string {
    const normalized = value.trim();
    if (!normalized) throw new InvalidMealPlanningError(`${label} is required.`);
    return normalized;
  }
}

export class WeeklyPlanId extends Identifier {
  static from(value: string): WeeklyPlanId {
    return new WeeklyPlanId(Identifier.normalize(value, 'Weekly plan id'));
  }
}

export class HouseholdId extends Identifier {
  static from(value: string): HouseholdId {
    return new HouseholdId(Identifier.normalize(value, 'Household id'));
  }
}

export class PlannedMealId extends Identifier {
  static from(value: string): PlannedMealId {
    return new PlannedMealId(Identifier.normalize(value, 'Planned meal id'));
  }
}

export class PlannedMealParticipantId extends Identifier {
  static from(value: string): PlannedMealParticipantId {
    return new PlannedMealParticipantId(Identifier.normalize(value, 'Planned meal participant id'));
  }
}
