import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum SearchPreparationStateDto {
  RAW = 'RAW',
  COOKED = 'COOKED',
  READY_TO_EAT = 'READY_TO_EAT',
}

export enum SearchFoodTypeDto {
  GENERIC = 'GENERIC',
  COMMERCIAL = 'COMMERCIAL',
  CUSTOM = 'CUSTOM',
}

export class SearchFoodsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: SearchPreparationStateDto })
  @IsOptional()
  @IsEnum(SearchPreparationStateDto)
  preparationState?: SearchPreparationStateDto;

  @ApiPropertyOptional({ enum: SearchFoodTypeDto })
  @IsOptional()
  @IsEnum(SearchFoodTypeDto)
  foodType?: SearchFoodTypeDto;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
