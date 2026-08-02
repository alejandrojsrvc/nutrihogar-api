import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { MealTypeDto } from './create-meal-request.dto';

export class ListMealsQueryDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  adultProfileId?: string;

  @ApiPropertyOptional({ example: '2026-07-29' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-29' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @ApiPropertyOptional({ enum: MealTypeDto })
  @IsOptional()
  @IsEnum(MealTypeDto)
  mealType?: MealTypeDto;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) => normalizeBoolean(value))
  @IsBoolean()
  includeCancelled = false;
}

function normalizeBoolean(value: unknown): unknown {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}
