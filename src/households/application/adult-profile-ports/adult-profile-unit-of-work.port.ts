import {
  ActivityLevel,
  AdultProfileView,
  BiologicalSex,
  DietaryRestrictionInput,
  PrimaryGoal,
} from '../adult-profile-models/adult-profile-view';

export const ADULT_PROFILE_UNIT_OF_WORK = Symbol('AdultProfileUnitOfWork');

export interface CreateAdultProfileInput {
  householdId: string;
  userId: string;
  name: string;
  birthDate: Date;
  biologicalSex: BiologicalSex;
  weightKg?: number | null;
  heightCm: number;
  activityLevel: ActivityLevel;
  primaryGoal: PrimaryGoal;
  hasKitchenScale: boolean;
  dietaryRestrictions: DietaryRestrictionInput[];
}

export interface UpdateAdultProfileInput {
  name?: string;
  birthDate?: Date;
  biologicalSex?: BiologicalSex;
  weightKg?: number | null;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  primaryGoal?: PrimaryGoal;
  hasKitchenScale?: boolean;
  dietaryRestrictions?: DietaryRestrictionInput[];
}

export interface AdultProfileUnitOfWork {
  create(input: CreateAdultProfileInput): Promise<AdultProfileView>;
  update(profileId: string, input: UpdateAdultProfileInput): Promise<AdultProfileView | null>;
}
