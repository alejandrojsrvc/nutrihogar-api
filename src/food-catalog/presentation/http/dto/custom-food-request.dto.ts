import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum FoodPreparationStateDto {
  RAW = 'RAW',
  COOKED = 'COOKED',
  READY_TO_EAT = 'READY_TO_EAT',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum FoodReferenceUnitDto {
  GRAM = 'GRAM',
  MILLILITER = 'MILLILITER',
  UNIT = 'UNIT',
}

export enum FoodConfidenceLevelDto {
  VERIFIED = 'VERIFIED',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  USER_PROVIDED = 'USER_PROVIDED',
}

export class FoodNutrientRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  nutrientDefinitionId!: string;

  @ApiProperty({ minimum: 0, example: 25.4 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  amount!: number;
}

export class FoodServingRequestDto {
  @ApiProperty({ example: '1 rebanada', maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ minimum: 0, exclusiveMinimum: true, example: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 'unidad', maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiPropertyOptional({ minimum: 0, exclusiveMinimum: true, example: 30 })
  @ValidateIf(
    (serving: FoodServingRequestDto) =>
      serving.equivalentMilliliters === undefined || serving.equivalentMilliliters === null,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  equivalentGrams?: number | null;

  @ApiPropertyOptional({ minimum: 0, exclusiveMinimum: true, example: 250 })
  @ValidateIf(
    (serving: FoodServingRequestDto) =>
      serving.equivalentGrams === undefined || serving.equivalentGrams === null,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  equivalentMilliliters?: number | null;
}

export class CreateCustomFoodRequestDto {
  @ApiProperty({ example: 'Pan casero', maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'Receta familiar', maxLength: 150 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  brand?: string | null;

  @ApiPropertyOptional({ example: 'Pan integral preparado en casa.' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: FoodPreparationStateDto })
  @IsEnum(FoodPreparationStateDto)
  preparationState!: FoodPreparationStateDto;

  @ApiProperty({ minimum: 0, exclusiveMinimum: true, example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  referenceQuantity!: number;

  @ApiProperty({ enum: FoodReferenceUnitDto })
  @IsEnum(FoodReferenceUnitDto)
  referenceUnit!: FoodReferenceUnitDto;

  @ApiPropertyOptional({ example: 'USER', maxLength: 100 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  source?: string;

  @ApiProperty({ enum: FoodConfidenceLevelDto, example: 'USER_PROVIDED' })
  @IsEnum(FoodConfidenceLevelDto)
  confidenceLevel!: FoodConfidenceLevelDto;

  @ApiProperty({ type: FoodNutrientRequestDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FoodNutrientRequestDto)
  nutrients!: FoodNutrientRequestDto[];

  @ApiPropertyOptional({ type: FoodServingRequestDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodServingRequestDto)
  servings?: FoodServingRequestDto[];
}

export class UpdateCustomFoodRequestDto extends PartialType(CreateCustomFoodRequestDto) {}

function trimString({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  return typeof input === 'string' ? input.trim() : input;
}
