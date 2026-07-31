import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class ConfirmNutritionGoalSuggestionRequestDto {
  @ApiPropertyOptional({ example: 2150, exclusiveMinimum: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  dailyCalories?: number;

  @ApiPropertyOptional({ example: 170, exclusiveMinimum: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  proteinGrams?: number;

  @ApiPropertyOptional({ example: 210, exclusiveMinimum: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  carbohydrateGrams?: number;

  @ApiPropertyOptional({ example: 70, exclusiveMinimum: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  fatGrams?: number;

  @ApiPropertyOptional({ example: 30, exclusiveMinimum: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  fiberGrams?: number;
}
