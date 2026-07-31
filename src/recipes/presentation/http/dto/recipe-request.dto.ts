import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { RecipeIngredientUnit } from '../../../domain/models/recipe.models';

export class RecipeIngredientRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  foodId!: string;

  @ApiProperty({ exclusiveMinimum: true, example: 600 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT', 'SERVING'] })
  @IsString()
  unit!: RecipeIngredientUnit;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  servingId?: string | null;

  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class RecipeInstructionRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;

  @ApiProperty({ example: 'Cocinar el pollo.', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;
}

export class CreateRecipeRequestDto {
  @ApiProperty({ example: 'Arroz con pollo', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'LUNCH', nullable: true, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string | null;

  @ApiProperty({ minimum: 1, example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  defaultServings!: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true, example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  estimatedPreparationMinutes?: number | null;

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: RecipeIngredientRequestDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientRequestDto)
  ingredients!: RecipeIngredientRequestDto[];

  @ApiPropertyOptional({ type: RecipeInstructionRequestDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeInstructionRequestDto)
  instructions?: RecipeInstructionRequestDto[];
}

export class UpdateRecipeRequestDto {
  @ApiPropertyOptional({ example: 'Arroz con pollo', maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'LUNCH', nullable: true, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string | null;

  @ApiPropertyOptional({ minimum: 1, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  defaultServings?: number;

  @ApiPropertyOptional({ minimum: 1, nullable: true, example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  estimatedPreparationMinutes?: number | null;

  @ApiPropertyOptional({ type: String, isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: RecipeIngredientRequestDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientRequestDto)
  ingredients?: RecipeIngredientRequestDto[];

  @ApiPropertyOptional({ type: RecipeInstructionRequestDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeInstructionRequestDto)
  instructions?: RecipeInstructionRequestDto[];
}
