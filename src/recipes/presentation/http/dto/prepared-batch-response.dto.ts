import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreparedBatchIngredientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  servingId!: string | null;

  @ApiProperty({ example: 600 })
  quantity!: number;

  @ApiProperty({ example: 'GRAM' })
  unit!: string;

  @ApiProperty({ example: 1 })
  position!: number;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  foodNameSnapshot!: string | null;

  @ApiPropertyOptional({ nullable: true })
  brandSnapshot!: string | null;

  @ApiPropertyOptional({ nullable: true })
  preparationStateSnapshot!: string | null;

  @ApiPropertyOptional({ nullable: true })
  confidenceLevel!: string | null;

  @ApiPropertyOptional({ nullable: true })
  baseQuantity!: number | null;

  @ApiPropertyOptional({ nullable: true })
  baseUnit!: string | null;

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  nutrients!: Record<string, number>;
}

export class PreparedBatchWarningResponseDto {
  @ApiProperty({ format: 'uuid' })
  ingredientId!: string;

  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiProperty({ example: 'NUTRIENTS_UNAVAILABLE' })
  code!: string;

  @ApiProperty({ example: 'No nutritional data is available for this ingredient.' })
  message!: string;
}

export class PreparedBatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  recipeId!: string | null;

  @ApiProperty({ example: 'Arroz con pollo' })
  recipeNameSnapshot!: string;

  @ApiProperty({ format: 'date-time' })
  preparedAt!: Date;

  @ApiProperty({ enum: ['DRAFT', 'INGREDIENTS_CONFIRMED', 'FINALIZED', 'CANCELLED'] })
  status!: string;

  @ApiProperty({ type: PreparedBatchIngredientResponseDto, isArray: true })
  ingredients!: PreparedBatchIngredientResponseDto[];

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  totalNutrients!: Record<string, number>;

  @ApiPropertyOptional({ nullable: true, example: 1650 })
  finalCookedWeight!: number | null;

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  nutrientsPerGram!: Record<string, number>;

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  nutrientsPer100Grams!: Record<string, number>;

  @ApiProperty({ type: PreparedBatchWarningResponseDto, isArray: true })
  warnings!: PreparedBatchWarningResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  finalizedAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  cancelledAt!: Date | null;
}
