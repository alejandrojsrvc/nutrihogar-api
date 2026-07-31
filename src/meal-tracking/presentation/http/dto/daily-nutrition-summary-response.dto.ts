import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DailyNutritionValuesResponseDto {
  @ApiProperty({ example: 2200 })
  dailyCalories!: number;

  @ApiProperty({ example: 170 })
  proteinGrams!: number;

  @ApiProperty({ example: 230 })
  carbohydrateGrams!: number;

  @ApiProperty({ example: 70 })
  fatGrams!: number;

  @ApiProperty({ example: 30 })
  fiberGrams!: number;
}

export class DailyNutritionMealResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LUNCH' })
  mealType!: string;

  @ApiProperty({ format: 'date-time' })
  consumedAt!: Date;

  @ApiProperty({ type: Object })
  totals!: Record<string, number>;
}

export class DailyNutritionSummaryResponseDto {
  @ApiProperty({ example: '2026-07-29' })
  date!: string;

  @ApiProperty({ format: 'uuid' })
  profileId!: string;

  @ApiProperty({ example: 'Alejandro' })
  profileName!: string;

  @ApiPropertyOptional({ type: DailyNutritionValuesResponseDto, nullable: true })
  goal!: DailyNutritionValuesResponseDto | null;

  @ApiProperty({ type: DailyNutritionValuesResponseDto })
  consumed!: DailyNutritionValuesResponseDto;

  @ApiPropertyOptional({ type: DailyNutritionValuesResponseDto, nullable: true })
  remaining!: DailyNutritionValuesResponseDto | null;

  @ApiProperty({ type: DailyNutritionMealResponseDto, isArray: true })
  meals!: DailyNutritionMealResponseDto[];
}
