import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum BiologicalSexDto {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ActivityLevelDto {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum PrimaryGoalDto {
  FAT_LOSS = 'FAT_LOSS',
  MAINTENANCE = 'MAINTENANCE',
  MUSCLE_GAIN = 'MUSCLE_GAIN',
}

export enum DietaryRestrictionTypeDto {
  ALLERGY = 'ALLERGY',
  INTOLERANCE = 'INTOLERANCE',
  PREFERENCE = 'PREFERENCE',
}

export class DietaryRestrictionRequestDto {
  @ApiProperty({ enum: DietaryRestrictionTypeDto, example: 'ALLERGY' })
  @IsEnum(DietaryRestrictionTypeDto)
  type!: DietaryRestrictionTypeDto;

  @ApiProperty({ example: 'Maní', maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'SEVERE', maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  severity?: string | null;

  @ApiPropertyOptional({ example: 'Evitar contaminación cruzada.' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateAdultProfileRequestDto {
  @ApiProperty({ example: 'Alejandro', maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ format: 'date', example: '1990-05-20' })
  @IsDateString({ strict: true })
  birthDate!: string;

  @ApiProperty({ enum: BiologicalSexDto })
  @IsEnum(BiologicalSexDto)
  biologicalSex!: BiologicalSexDto;

  @ApiPropertyOptional({ example: 80.5, minimum: 0, exclusiveMinimum: true })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  weightKg?: number | null;

  @ApiProperty({ example: 175.5, minimum: 0, exclusiveMinimum: true })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  heightCm!: number;

  @ApiProperty({ enum: ActivityLevelDto })
  @IsEnum(ActivityLevelDto)
  activityLevel!: ActivityLevelDto;

  @ApiProperty({ enum: PrimaryGoalDto })
  @IsEnum(PrimaryGoalDto)
  primaryGoal!: PrimaryGoalDto;

  @ApiProperty({ example: true })
  @IsBoolean()
  hasKitchenScale!: boolean;

  @ApiPropertyOptional({ type: DietaryRestrictionRequestDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DietaryRestrictionRequestDto)
  dietaryRestrictions?: DietaryRestrictionRequestDto[];
}

function trimString({ value }: TransformFnParams): unknown {
  const input: unknown = value;

  return typeof input === 'string' ? input.trim() : input;
}
