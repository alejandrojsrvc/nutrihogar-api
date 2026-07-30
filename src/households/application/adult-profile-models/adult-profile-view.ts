export type BiologicalSex = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type PrimaryGoal = 'FAT_LOSS' | 'MAINTENANCE' | 'MUSCLE_GAIN';
export type DietaryRestrictionType = 'ALLERGY' | 'INTOLERANCE' | 'PREFERENCE';

export interface DietaryRestrictionView {
  id: string;
  adultProfileId: string;
  type: DietaryRestrictionType;
  name: string;
  severity: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdultProfileView {
  id: string;
  householdId: string;
  userId: string;
  name: string;
  birthDate: Date;
  age: number;
  biologicalSex: BiologicalSex;
  weightKg: number | null;
  heightCm: number;
  activityLevel: ActivityLevel;
  primaryGoal: PrimaryGoal;
  hasKitchenScale: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  dietaryRestrictions: DietaryRestrictionView[];
}

export interface DietaryRestrictionInput {
  type: DietaryRestrictionType;
  name: string;
  severity?: string | null;
  notes?: string | null;
}
