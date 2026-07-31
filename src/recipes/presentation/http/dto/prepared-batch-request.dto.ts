import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { RecipeIngredientUnit } from '../../../domain/models/recipe.models';

export class PreparedBatchIngredientRequestDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  foodId!: string;

  @ApiProperty({ example: 600, exclusiveMinimum: true })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  quantity!: number;

  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT', 'SERVING'] })
  @IsString()
  @IsIn(['GRAM', 'MILLILITER', 'UNIT', 'SERVING'])
  unit!: RecipeIngredientUnit;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  servingId?: string | null;

  @ApiProperty({ minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position!: number;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class StartPreparedBatchRequestDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  preparedAt?: string;
}

export class UpdatePreparedBatchIngredientsRequestDto {
  @ApiProperty({ type: PreparedBatchIngredientRequestDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreparedBatchIngredientRequestDto)
  ingredients!: PreparedBatchIngredientRequestDto[];
}

export class FinalizePreparedBatchRequestDto {
  @ApiProperty({ example: 1650, exclusiveMinimum: true })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  finalCookedWeight!: number;

  @ApiProperty({ enum: ['GRAM'], default: 'GRAM' })
  @IsString()
  @IsIn(['GRAM'])
  unit!: 'GRAM';
}
