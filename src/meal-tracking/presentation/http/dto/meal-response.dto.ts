import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MealNutrientResponseDto {
  @ApiProperty({ example: 'PROTEIN' })
  code!: string;

  @ApiProperty({ example: 'Proteína' })
  name!: string;

  @ApiProperty({ example: 'g' })
  unit!: string;

  @ApiProperty({ example: 73.06 })
  amount!: number;
}

export class MealItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  foodId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  foodServingId!: string | null;

  @ApiProperty({ example: 'Pollo cocido' })
  nameSnapshot!: string;

  @ApiPropertyOptional({ example: 'Marca familiar', nullable: true })
  brandSnapshot!: string | null;

  @ApiProperty({ example: 'COOKED' })
  preparationStateSnapshot!: string;

  @ApiProperty({ example: 220 })
  quantity!: number;

  @ApiProperty({ example: 'GRAM' })
  unit!: string;

  @ApiProperty({ example: 220 })
  baseQuantity!: number;

  @ApiProperty({ example: 'GRAM' })
  baseUnit!: string;

  @ApiProperty({ example: 'WEIGHED' })
  measurementMethod!: string;

  @ApiProperty({ example: 'VERIFIED' })
  confidenceLevel!: string;

  @ApiProperty({ type: MealNutrientResponseDto, isArray: true })
  nutrients!: MealNutrientResponseDto[];
}

export class MealResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ example: 'LUNCH' })
  mealType!: string;

  @ApiProperty({ format: 'date-time' })
  consumedAt!: Date;

  @ApiProperty({ example: 'CONFIRMED' })
  status!: string;

  @ApiProperty({ enum: ['MANUAL', 'DUPLICATED', 'PREPARED_BATCH', 'PREPARED_INVENTORY'] })
  source!: string;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({
    type: Object,
    example: { ENERGY_KCAL: 597, PROTEIN: 73.06 },
    description: 'Nutrientes confirmados a partir de los snapshots de los alimentos consumidos.',
  })
  totals!: Record<string, number>;

  @ApiProperty({ type: MealItemResponseDto, isArray: true })
  items!: MealItemResponseDto[];
}
