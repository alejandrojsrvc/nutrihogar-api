import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class PostponeNutritionGoalReviewRequestDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  postponedUntil!: string;
}

export class NutritionGoalReviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() adultProfileId!: string;
  @ApiProperty() outcome!: string;
  @ApiProperty({ type: String, isArray: true }) reasons!: string[];
  @ApiProperty() evaluatedAt!: Date;
  @ApiPropertyOptional() postponedUntil!: Date | null;
  @ApiPropertyOptional() proposalSuggestionId!: string | null;
  @ApiPropertyOptional() terminalAction!: string | null;
  @ApiPropertyOptional() proposal!: NutritionGoalReviewProposalResponseDto | null;
  @ApiPropertyOptional() differences!: NutritionGoalReviewDifferencesResponseDto | null;
}

export class NutritionGoalReviewProposalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() dailyCalories!: number;
  @ApiProperty() proteinGrams!: number;
  @ApiProperty() carbohydrateGrams!: number;
  @ApiProperty() fatGrams!: number;
  @ApiProperty() fiberGrams!: number;
}

export class NutritionGoalReviewDifferencesResponseDto {
  @ApiProperty() calories!: number;
  @ApiProperty() proteinGrams!: number;
  @ApiProperty() carbohydrateGrams!: number;
  @ApiProperty() fatGrams!: number;
  @ApiProperty() fiberGrams!: number;
}
