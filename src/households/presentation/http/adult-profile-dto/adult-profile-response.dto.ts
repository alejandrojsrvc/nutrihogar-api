import { ApiProperty } from '@nestjs/swagger';
import type {
  ActivityLevel,
  BiologicalSex,
  DietaryRestrictionType,
  PrimaryGoal,
} from '../../../application/adult-profile-models/adult-profile-view';

export class DietaryRestrictionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ enum: ['ALLERGY', 'INTOLERANCE', 'PREFERENCE'] })
  type!: DietaryRestrictionType;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  severity!: string | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AdultProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'date' })
  birthDate!: string;

  @ApiProperty({ example: 36 })
  age!: number;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  biologicalSex!: BiologicalSex;

  @ApiProperty({ example: 175.5 })
  heightCm!: number;

  @ApiProperty({
    enum: ['SEDENTARY', 'LIGHT', 'MODERATE', 'HIGH', 'VERY_HIGH'],
  })
  activityLevel!: ActivityLevel;

  @ApiProperty({ enum: ['FAT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN'] })
  primaryGoal!: PrimaryGoal;

  @ApiProperty()
  hasKitchenScale!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: DietaryRestrictionResponseDto, isArray: true })
  dietaryRestrictions!: DietaryRestrictionResponseDto[];
}
