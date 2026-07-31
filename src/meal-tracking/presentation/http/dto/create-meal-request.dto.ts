import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum MealTypeDto {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  SNACK = 'SNACK',
  DINNER = 'DINNER',
  EXTRA = 'EXTRA',
}

export enum MealUnitDto {
  GRAM = 'GRAM',
  MILLILITER = 'MILLILITER',
  UNIT = 'UNIT',
  SERVING = 'SERVING',
}

export enum MealMeasurementMethodDto {
  WEIGHED = 'WEIGHED',
  SERVING = 'SERVING',
  UNIT = 'UNIT',
  APPROXIMATED = 'APPROXIMATED',
}

export class CreateMealItemRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  foodId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  servingId?: string;

  @ApiProperty({ minimum: 0, exclusiveMinimum: true, example: 220 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ enum: MealUnitDto })
  @IsEnum(MealUnitDto)
  unit!: MealUnitDto;

  @ApiProperty({ enum: MealMeasurementMethodDto })
  @IsEnum(MealMeasurementMethodDto)
  measurementMethod!: MealMeasurementMethodDto;
}

export class CreateMealRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  adultProfileId!: string;

  @ApiProperty({ enum: MealTypeDto })
  @IsEnum(MealTypeDto)
  mealType!: MealTypeDto;

  @ApiProperty({ format: 'date-time', example: '2026-07-29T13:30:00-03:00' })
  @IsDateString()
  consumedAt!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ApiProperty({ type: CreateMealItemRequestDto, isArray: true })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMealItemRequestDto)
  items!: CreateMealItemRequestDto[];
}
