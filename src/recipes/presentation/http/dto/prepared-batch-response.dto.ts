import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreparedBatchNutrientResponseDto {
  @ApiProperty({ example: 'ENERGY_KCAL' })
  code!: string;

  @ApiProperty({ example: 'Energy' })
  name!: string;

  @ApiProperty({ example: 'kcal' })
  unit!: string;

  @ApiProperty({ example: 2430 })
  amount!: number;
}

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

  @ApiProperty({ type: PreparedBatchNutrientResponseDto, isArray: true })
  nutrients!: PreparedBatchNutrientResponseDto[];
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

  @ApiProperty({ type: PreparedBatchNutrientResponseDto, isArray: true })
  totalNutrients!: PreparedBatchNutrientResponseDto[];

  @ApiPropertyOptional({ nullable: true, example: 1650 })
  finalCookedWeight!: number | null;

  @ApiProperty({ type: PreparedBatchNutrientResponseDto, isArray: true })
  nutrientsPerGram!: PreparedBatchNutrientResponseDto[];

  @ApiProperty({ type: PreparedBatchNutrientResponseDto, isArray: true })
  nutrientsPer100Grams!: PreparedBatchNutrientResponseDto[];

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
