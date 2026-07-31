import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ServedPortionRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  adultProfileId!: string;

  @ApiProperty({ example: 520, exclusiveMinimum: true })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  servedWeight!: number;
}

export class ServePreparedBatchPortionsRequestDto {
  @ApiProperty({ type: ServedPortionRequestDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServedPortionRequestDto)
  portions!: ServedPortionRequestDto[];

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  servedAt?: string;
}
