import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateMealItemRequestDto, MealTypeDto } from './create-meal-request.dto';

export class UpdateMealRequestDto {
  @ApiPropertyOptional({ enum: MealTypeDto })
  @IsOptional()
  @IsEnum(MealTypeDto)
  mealType?: MealTypeDto;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  consumedAt?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @ApiPropertyOptional({ type: CreateMealItemRequestDto, isArray: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMealItemRequestDto)
  items?: CreateMealItemRequestDto[];
}
