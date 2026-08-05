import { Transform, Type } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum NutritionLabelUnitDto {
  GRAM = 'GRAM',
  MILLILITER = 'MILLILITER',
}
export enum NutritionLabelPreparationStateDto {
  RAW = 'RAW',
  COOKED = 'COOKED',
  READY_TO_EAT = 'READY_TO_EAT',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export class CreateNutritionLabelDraftRequestDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;
  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  brand?: string;
  @ApiPropertyOptional({ example: '500' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,6' })
  packageQuantity?: string;
  @ApiPropertyOptional({ enum: NutritionLabelUnitDto })
  @IsOptional()
  @IsEnum(NutritionLabelUnitDto)
  packageUnit?: NutritionLabelUnitDto;
}

export class ConfirmedNutrientDto {
  @ApiProperty({ example: 'PROTEIN' }) @IsString() @IsNotEmpty() code!: string;
  @ApiProperty({ example: '10.5' }) @IsDecimal({ decimal_digits: '0,6' }) amount!: string;
}

export class ConfirmedServingDto {
  @ApiProperty({ example: '1 slice' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
  @ApiProperty({ example: '1' }) @IsDecimal({ decimal_digits: '0,6' }) quantity!: string;
  @ApiProperty({ example: 'slice' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;
  @ApiPropertyOptional({ example: '50' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,6' })
  equivalentGrams?: string;
  @ApiPropertyOptional({ example: '250' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,6' })
  equivalentMilliliters?: string;
}

export class ConfirmNutritionLabelDraftRequestDto {
  @ApiProperty({ maxLength: 150 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;
  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  brand?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() description?: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() targetFoodId?: string;
  @ApiProperty({ enum: NutritionLabelPreparationStateDto })
  @IsEnum(NutritionLabelPreparationStateDto)
  preparationState!: NutritionLabelPreparationStateDto;
  @ApiProperty({ example: '500' }) @IsDecimal({ decimal_digits: '0,6' }) packageQuantity!: string;
  @ApiProperty({ enum: NutritionLabelUnitDto })
  @IsEnum(NutritionLabelUnitDto)
  packageUnit!: NutritionLabelUnitDto;
  @ApiPropertyOptional({ example: '100' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,6' })
  minimumQuantity?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString() expiresAt?: string;
  @ApiProperty({ example: '50' }) @IsDecimal({ decimal_digits: '0,6' }) basisQuantity!: string;
  @ApiProperty({ enum: NutritionLabelUnitDto })
  @IsEnum(NutritionLabelUnitDto)
  basisUnit!: NutritionLabelUnitDto;
  @ApiProperty({ type: ConfirmedNutrientDto, isArray: true })
  @IsArray()
  @ArrayMinSize(4)
  @ValidateNested({ each: true })
  @Type(() => ConfirmedNutrientDto)
  nutrients!: ConfirmedNutrientDto[];
  @ApiProperty({ type: ConfirmedServingDto })
  @ValidateNested()
  @Type(() => ConfirmedServingDto)
  serving!: ConfirmedServingDto;
}

class NutritionLabelStructuredBasisDto {
  @ApiProperty({ enum: ['PER_SERVING', 'PER_100'], nullable: true })
  type!: 'PER_SERVING' | 'PER_100' | null;
  @ApiProperty({ nullable: true, type: Number }) value!: number | null;
  @ApiProperty({ enum: ['g', 'ml'], nullable: true }) unit!: 'g' | 'ml' | null;
}

class NutritionLabelStructuredNutrientsDto {
  @ApiProperty({ nullable: true, type: Number }) energy_kcal!: number | null;
  @ApiProperty({ nullable: true, type: Number }) protein_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) total_fat_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) saturated_fat_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) trans_fat_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) carbohydrates_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) sugars_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) fiber_g!: number | null;
  @ApiProperty({ nullable: true, type: Number }) sodium_mg!: number | null;
}

class NutritionLabelStructuredDeclarationDto {
  @ApiProperty({ type: NutritionLabelStructuredBasisDto })
  basis!: NutritionLabelStructuredBasisDto;
  @ApiProperty({ type: NutritionLabelStructuredNutrientsDto })
  nutrients!: NutritionLabelStructuredNutrientsDto;
}

class NutritionLabelStructuredNetContentDto {
  @ApiProperty({ nullable: true, type: Number }) value!: number | null;
  @ApiProperty({ enum: ['g', 'ml'], nullable: true }) unit!: 'g' | 'ml' | null;
}

class NutritionLabelStructuredServingSizeDto {
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true, type: Number }) value!: number | null;
  @ApiProperty({ nullable: true }) unit!: string | null;
}

class NutritionLabelStructuredAllergensDto {
  @ApiProperty({ type: String, isArray: true }) contains!: string[];
  @ApiProperty({ type: String, isArray: true }) may_contain!: string[];
}

export class NutritionLabelStructuredExtractionDto {
  @ApiProperty({ example: 'nutrition-label.v1' }) schema_version!: string;
  @ApiProperty({ nullable: true }) product_name!: string | null;
  @ApiProperty({ nullable: true }) brand!: string | null;
  @ApiProperty({ type: NutritionLabelStructuredNetContentDto })
  net_content!: NutritionLabelStructuredNetContentDto;
  @ApiProperty({ type: NutritionLabelStructuredServingSizeDto })
  serving_size!: NutritionLabelStructuredServingSizeDto;
  @ApiProperty({ nullable: true, type: Number }) servings_per_container!: number | null;
  @ApiProperty({ type: NutritionLabelStructuredDeclarationDto, isArray: true })
  nutrition_declarations!: NutritionLabelStructuredDeclarationDto[];
  @ApiProperty({ type: String, isArray: true }) ingredients!: string[];
  @ApiProperty({ type: NutritionLabelStructuredAllergensDto })
  allergens!: NutritionLabelStructuredAllergensDto;
  @ApiProperty({ type: String, isArray: true }) warnings!: string[];
  @ApiProperty({ nullable: true, type: Number }) confidence!: number | null;
  @ApiProperty() requires_review!: boolean;
}

export class NutritionLabelDraftResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) householdId!: string;
  @ApiProperty({ format: 'uuid' }) createdById!: string;
  @ApiProperty({ minLength: 64, maxLength: 64 }) documentHash!: string;
  @ApiProperty({ enum: ['PENDING_REVIEW', 'CONFIRMED'] }) status!: string;
  @ApiProperty({ nullable: true }) name!: string | null;
  @ApiProperty({ nullable: true }) brand!: string | null;
  @ApiProperty({ nullable: true }) packageQuantity!: string | null;
  @ApiProperty({ enum: NutritionLabelUnitDto, nullable: true })
  packageUnit!: NutritionLabelUnitDto | null;
  @ApiProperty({ type: NutritionLabelStructuredExtractionDto })
  extractedData!: NutritionLabelStructuredExtractionDto;
  @ApiProperty({ type: String, isArray: true }) warnings!: string[];
  @ApiProperty({ type: String, isArray: true }) missingFields!: string[];
  @ApiProperty({ deprecated: true }) rawText!: string;
  @ApiProperty({ nullable: true }) confidence!: number | null;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
  @ApiProperty({ format: 'date-time', nullable: true }) confirmedAt!: Date | null;
  @ApiProperty({ format: 'uuid', nullable: true }) confirmedFoodId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class ConfirmedNutritionLabelFoodResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) householdId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) brand!: string | null;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty({ type: Object }) category!: object;
  @ApiProperty({ enum: ['CUSTOM', 'COMMERCIAL'] }) foodType!: 'CUSTOM' | 'COMMERCIAL';
  @ApiProperty({ enum: NutritionLabelPreparationStateDto }) preparationState!: string;
  @ApiProperty({ example: 100 }) referenceQuantity!: number;
  @ApiProperty({ enum: NutritionLabelUnitDto }) referenceUnit!: NutritionLabelUnitDto;
  @ApiProperty({ enum: ['NUTRITION_LABEL_OCR'] }) source!: 'NUTRITION_LABEL_OCR';
  @ApiProperty({ format: 'uuid', nullable: true }) sourceReference!: string | null;
  @ApiProperty({ enum: ['USER_PROVIDED'] }) confidenceLevel!: 'USER_PROVIDED';
  @ApiProperty() isGlobal!: boolean;
  @ApiProperty({ type: Object, isArray: true }) nutrients!: object[];
  @ApiProperty({ type: Object, isArray: true }) servings!: object[];
  @ApiProperty({ type: String, isArray: true }) aliases!: string[];
}

export class NutritionLabelInventoryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() currentQuantity!: string;
  @ApiProperty({ enum: NutritionLabelUnitDto }) unit!: NutritionLabelUnitDto;
  @ApiProperty({ nullable: true }) minimumQuantity!: string | null;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true }) expiresAt!: Date | null;
  @ApiProperty({ enum: ['ACTIVE'] }) status!: 'ACTIVE';
}

export class ConfirmNutritionLabelDraftResponseDto {
  @ApiProperty({ type: ConfirmedNutritionLabelFoodResponseDto })
  food!: ConfirmedNutritionLabelFoodResponseDto;
  @ApiProperty({ type: NutritionLabelInventoryResponseDto })
  inventory!: NutritionLabelInventoryResponseDto;
}

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
