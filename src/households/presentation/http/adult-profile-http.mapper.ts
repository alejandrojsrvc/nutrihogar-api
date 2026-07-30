import { AdultProfileView } from '../../application/adult-profile-models/adult-profile-view';
import {
  AdultProfileResponseDto,
  DietaryRestrictionResponseDto,
} from './adult-profile-dto/adult-profile-response.dto';

export class AdultProfileHttpMapper {
  static toResponse(profile: AdultProfileView): AdultProfileResponseDto {
    return {
      id: profile.id,
      householdId: profile.householdId,
      userId: profile.userId,
      name: profile.name,
      birthDate: profile.birthDate.toISOString().slice(0, 10),
      age: profile.age,
      biologicalSex: profile.biologicalSex,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      primaryGoal: profile.primaryGoal,
      hasKitchenScale: profile.hasKitchenScale,
      isActive: profile.isActive,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      dietaryRestrictions: profile.dietaryRestrictions.map((restriction) =>
        this.toRestrictionResponse(restriction),
      ),
    };
  }

  static toResponseList(profiles: AdultProfileView[]): AdultProfileResponseDto[] {
    return profiles.map((profile) => this.toResponse(profile));
  }

  private static toRestrictionResponse(
    restriction: AdultProfileView['dietaryRestrictions'][number],
  ): DietaryRestrictionResponseDto {
    return {
      id: restriction.id,
      adultProfileId: restriction.adultProfileId,
      type: restriction.type,
      name: restriction.name,
      severity: restriction.severity,
      notes: restriction.notes,
      createdAt: restriction.createdAt.toISOString(),
      updatedAt: restriction.updatedAt.toISOString(),
    };
  }
}
