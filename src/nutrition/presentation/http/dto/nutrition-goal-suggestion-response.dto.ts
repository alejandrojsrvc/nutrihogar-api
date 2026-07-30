import { ApiProperty } from '@nestjs/swagger';
import type { NutritionGoalSuggestionStatus } from '../../../domain/models/nutrition-goal.models';

export class NutritionGoalCalculationResponseDto {
  @ApiProperty({ example: 1850 })
  bmr!: number;

  @ApiProperty({ example: 1.55 })
  activityFactor!: number;

  @ApiProperty({ example: 2868 })
  tdee!: number;
}

export class NutritionGoalValuesResponseDto {
  @ApiProperty({ example: 2294 })
  dailyCalories!: number;

  @ApiProperty({ example: 170 })
  proteinGrams!: number;

  @ApiProperty({ example: 260 })
  carbohydrateGrams!: number;

  @ApiProperty({ example: 64 })
  fatGrams!: number;

  @ApiProperty({ example: 32 })
  fiberGrams!: number;
}

export class NutritionGoalSuggestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: NutritionGoalCalculationResponseDto })
  calculation!: NutritionGoalCalculationResponseDto;

  @ApiProperty({ type: NutritionGoalValuesResponseDto })
  suggestion!: NutritionGoalValuesResponseDto;

  @ApiProperty({ enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED'] })
  status!: NutritionGoalSuggestionStatus;
}
