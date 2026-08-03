import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlannedMealParticipantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiPropertyOptional({ type: String, example: '1.5', nullable: true })
  suggestedQuantity!: string | null;

  @ApiPropertyOptional({ type: String, example: 'SERVING', nullable: true })
  suggestedUnit!: string | null;

  @ApiPropertyOptional({ type: String, example: '1.25', nullable: true })
  confirmedQuantity!: string | null;

  @ApiPropertyOptional({ type: String, example: 'SERVING', nullable: true })
  confirmedUnit!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  confirmedById?: string | null;

  @ApiPropertyOptional({ type: Date, format: 'date-time', nullable: true })
  confirmedAt?: Date | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  confirmationSnapshot?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  nutritionTargetSnapshot!: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class PlannedMealResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date' })
  date!: Date;

  @ApiProperty({ enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'EXTRA'] })
  type!: string;

  @ApiProperty({
    enum: ['RECIPE', 'PREVIOUS_MEAL', 'FREE_MEAL', 'RESTAURANT', 'DELIVERY', 'UNPLANNED', 'EMPTY'],
  })
  source!: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  recipeId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  previousMealId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Pollo con arroz' })
  nameSnapshot!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  nutritionSnapshot!: Record<string, unknown> | null;

  @ApiProperty({
    enum: ['PLANNED', 'PREPARED', 'SERVED', 'CONSUMED', 'SKIPPED', 'REPLACED', 'CANCELLED'],
  })
  status!: string;

  @ApiProperty({ type: PlannedMealParticipantResponseDto, isArray: true })
  participants!: PlannedMealParticipantResponseDto[];

  @ApiProperty({ example: 0 })
  position!: number;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  replacedMealId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  preparedBatchId!: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  mealId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class WeeklyPlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiProperty({ format: 'date' })
  weekStart!: Date;

  @ApiProperty({ format: 'date' })
  weekEnd!: Date;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] })
  status!: string;

  @ApiPropertyOptional({ type: String, example: '25000.00', nullable: true })
  weeklyBudget!: string | null;

  @ApiPropertyOptional({ type: String, example: 'ARS', nullable: true })
  currency!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdBy!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ type: Date, format: 'date-time', nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ type: PlannedMealResponseDto, isArray: true })
  meals!: PlannedMealResponseDto[];
}

export class WeeklyPlanListResponseDto {
  @ApiProperty({ type: WeeklyPlanResponseDto, isArray: true })
  items!: WeeklyPlanResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class QuantitySuggestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  participantId!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ example: '1.25' })
  quantity!: string;

  @ApiProperty({ example: 'SERVING' })
  unit!: string;

  @ApiProperty({ format: 'date-time' })
  goalValidFrom!: Date;

  @ApiProperty({ example: '650.000' })
  targetCalories!: string;
}

export class WeeklyRequirementResponseDto {
  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiProperty({ example: 'Arroz' })
  name!: string;

  @ApiProperty({ example: 'GRAM' })
  unit!: string;

  @ApiProperty({ example: '1200.000' })
  required!: string;
}

export class WeeklyRequirementsResponseDto {
  @ApiProperty({ type: WeeklyRequirementResponseDto, isArray: true })
  items!: WeeklyRequirementResponseDto[];

  @ApiProperty({ type: String, isArray: true })
  warnings!: string[];
}

export class InventoryComparisonItemResponseDto extends WeeklyRequirementResponseDto {
  @ApiProperty({ example: '900.000' })
  available!: string;

  @ApiProperty({ example: '300.000' })
  missing!: string;

  @ApiProperty({ example: '0.75' })
  coverage!: string;

  @ApiProperty({ enum: ['COMPLETE', 'PARTIAL', 'MISSING', 'NOT_NEEDED'] })
  status!: string;
}

export class InventoryComparisonResponseDto {
  @ApiProperty({ type: InventoryComparisonItemResponseDto, isArray: true })
  items!: InventoryComparisonItemResponseDto[];

  @ApiProperty({ type: String, isArray: true })
  warnings!: string[];
}

export class AdherenceCountsResponseDto {
  @ApiProperty({ example: 12 })
  planned!: number;

  @ApiProperty({ example: 8 })
  consumed!: number;

  @ApiProperty({ example: 2 })
  skipped!: number;

  @ApiProperty({ example: 1 })
  cancelled!: number;

  @ApiProperty({ example: 1 })
  replaced!: number;

  @ApiProperty({ example: 0 })
  unplanned!: number;
}

export class AdherencePercentagesResponseDto {
  @ApiProperty({ example: '66.67' })
  consumed!: string;

  @ApiProperty({ example: '0' })
  unplanned!: string;
}

export class AdherenceNutritionResponseDto {
  @ApiProperty({ example: '12000' })
  plannedCalories!: string;

  @ApiProperty({ example: '8500' })
  consumedCalories!: string;

  @ApiProperty({ example: '500' })
  plannedProtein!: string;

  @ApiProperty({ example: '350' })
  consumedProtein!: string;

  @ApiProperty({ example: '70.83' })
  caloriePercentage!: string;

  @ApiProperty({ example: '70' })
  proteinPercentage!: string;
}

export class AdherenceBreakdownResponseDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  byDay!: Record<string, { planned: number; consumed: number }>;

  @ApiProperty({ type: 'object', additionalProperties: true })
  byAdult!: Record<string, { planned: number; consumed: number }>;
}

export class AdherenceResponseDto {
  @ApiProperty({ format: 'uuid' })
  weeklyPlanId!: string;

  @ApiProperty({ format: 'date' })
  weekStart!: string;

  @ApiProperty({ type: AdherenceCountsResponseDto })
  counts!: AdherenceCountsResponseDto;

  @ApiProperty({ type: AdherencePercentagesResponseDto })
  percentages!: AdherencePercentagesResponseDto;

  @ApiProperty({ type: AdherenceNutritionResponseDto })
  nutrition!: AdherenceNutritionResponseDto;

  @ApiProperty({ type: AdherenceBreakdownResponseDto })
  breakdown!: AdherenceBreakdownResponseDto;

  @ApiProperty({ type: String, isArray: true })
  warnings!: string[];
}
