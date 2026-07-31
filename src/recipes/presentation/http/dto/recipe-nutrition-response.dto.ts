import { ApiProperty } from '@nestjs/swagger';

export class RecipeNutritionIngredientResponseDto {
  @ApiProperty({ format: 'uuid' })
  ingredientId!: string;

  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiProperty({ example: 600 })
  baseQuantity!: number;

  @ApiProperty({ example: 'GRAM' })
  baseUnit!: string;

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  nutrients!: Record<string, number>;
}

export class RecipeNutritionWarningResponseDto {
  @ApiProperty({ format: 'uuid' })
  ingredientId!: string;

  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiProperty({ example: 'NUTRIENTS_UNAVAILABLE' })
  code!: string;

  @ApiProperty({ example: 'No nutritional data is available for this ingredient.' })
  message!: string;
}

export class RecipeNutritionResponseDto {
  @ApiProperty({ format: 'uuid' })
  recipeId!: string;

  @ApiProperty({ example: 4 })
  servings!: number;

  @ApiProperty({ type: RecipeNutritionIngredientResponseDto, isArray: true })
  ingredients!: RecipeNutritionIngredientResponseDto[];

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  totalNutrients!: Record<string, number>;

  @ApiProperty({ type: Object, additionalProperties: { type: 'number' } })
  perServingNutrients!: Record<string, number>;

  @ApiProperty({ type: RecipeNutritionWarningResponseDto, isArray: true })
  warnings!: RecipeNutritionWarningResponseDto[];
}
