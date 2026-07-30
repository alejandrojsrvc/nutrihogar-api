import { ApiProperty } from '@nestjs/swagger';
import type {
  ConfidenceLevel,
  FoodType,
  PreparationState,
  ReferenceUnit,
} from '../../../application/models/food-catalog.models';

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() displayOrder!: number;
}

export class NutrientDefinitionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() unit!: string;
  @ApiProperty() group!: string;
  @ApiProperty() displayOrder!: number;
  @ApiProperty() isRequired!: boolean;
}

export class FoodSummaryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) householdId!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) brand!: string | null;
  @ApiProperty({ type: CategoryResponseDto }) category!: CategoryResponseDto;
  @ApiProperty({ enum: ['GENERIC', 'COMMERCIAL', 'CUSTOM', 'PREPARED'] }) foodType!: FoodType;
  @ApiProperty({ enum: ['RAW', 'COOKED', 'READY_TO_EAT', 'NOT_APPLICABLE'] })
  preparationState!: PreparationState;
  @ApiProperty() referenceQuantity!: number;
  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT'] }) referenceUnit!: ReferenceUnit;
  @ApiProperty({ nullable: true }) energyKcal!: number | null;
  @ApiProperty({ nullable: true }) proteinGrams!: number | null;
  @ApiProperty({ nullable: true }) carbohydrateGrams!: number | null;
  @ApiProperty({ nullable: true }) fatGrams!: number | null;
}

export class FoodNutrientResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: NutrientDefinitionResponseDto })
  nutrientDefinition!: NutrientDefinitionResponseDto;
  @ApiProperty() amount!: number;
}

export class FoodServingResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unit!: string;
  @ApiProperty({ nullable: true }) equivalentGrams!: number | null;
  @ApiProperty({ nullable: true }) equivalentMilliliters!: number | null;
}

export class FoodDetailResponseDto extends FoodSummaryResponseDto {
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() source!: string;
  @ApiProperty({ nullable: true }) sourceReference!: string | null;
  @ApiProperty({ enum: ['VERIFIED', 'HIGH', 'MEDIUM', 'LOW', 'USER_PROVIDED'] })
  confidenceLevel!: ConfidenceLevel;
  @ApiProperty() isGlobal!: boolean;
  @ApiProperty({ type: FoodNutrientResponseDto, isArray: true })
  nutrients!: FoodNutrientResponseDto[];
  @ApiProperty({ type: FoodServingResponseDto, isArray: true })
  servings!: FoodServingResponseDto[];
  @ApiProperty({ type: String, isArray: true }) aliases!: string[];
}

export class PaginationResponseDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export class FoodSearchResponseDto {
  @ApiProperty({ type: FoodSummaryResponseDto, isArray: true })
  items!: FoodSummaryResponseDto[];
  @ApiProperty({ type: PaginationResponseDto }) pagination!: PaginationResponseDto;
}
