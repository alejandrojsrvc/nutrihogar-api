import type { AdultProfile, DietaryRestriction, Prisma } from '@prisma/client';
import {
  AdultProfileView,
  DietaryRestrictionView,
} from '../../application/adult-profile-models/adult-profile-view';
import { calculateAge } from '../../application/adult-profile-use-cases/adult-profile-validation';

type AdultProfileWithRestrictions = AdultProfile & {
  dietaryRestrictions: DietaryRestriction[];
};

export class PrismaAdultProfileMapper {
  static toView(profile: AdultProfileWithRestrictions): AdultProfileView {
    return {
      id: profile.id,
      householdId: profile.householdId,
      userId: profile.userId,
      name: profile.name,
      birthDate: profile.birthDate,
      age: calculateAge(profile.birthDate),
      biologicalSex: profile.biologicalSex,
      weightKg: profile.weightKg?.toNumber() ?? null,
      heightCm: decimalToNumber(profile.heightCm),
      activityLevel: profile.activityLevel,
      primaryGoal: profile.primaryGoal,
      hasKitchenScale: profile.hasKitchenScale,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      deletedAt: profile.deletedAt,
      dietaryRestrictions: profile.dietaryRestrictions.map((restriction) =>
        this.toRestrictionView(restriction),
      ),
    };
  }

  private static toRestrictionView(restriction: DietaryRestriction): DietaryRestrictionView {
    return {
      id: restriction.id,
      adultProfileId: restriction.adultProfileId,
      type: restriction.type,
      name: restriction.name,
      severity: restriction.severity,
      notes: restriction.notes,
      createdAt: restriction.createdAt,
      updatedAt: restriction.updatedAt,
    };
  }
}

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}
