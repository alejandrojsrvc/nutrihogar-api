import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  IsPositive,
} from 'class-validator';

const leftoverStatuses = ['CONSUMED', 'DISCARDED', 'EXPIRED'] as const;
const leftoverFilters = ['AVAILABLE', ...leftoverStatuses] as const;

export class RegisterPreparedFoodLeftoverRequestDto {
  @ApiProperty({ example: 750, exclusiveMinimum: true })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  weight!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  storedAt!: string;

  @ApiPropertyOptional({ example: 'REFRIGERATOR', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storageLocation?: string;

  @ApiPropertyOptional({ example: 'Guardar para manana' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListPreparedFoodLeftoversQueryDto {
  @ApiPropertyOptional({ enum: leftoverFilters })
  @IsOptional()
  @IsIn(leftoverFilters)
  status?: (typeof leftoverFilters)[number];
}

export class UpdatePreparedFoodLeftoverStatusRequestDto {
  @ApiProperty({ enum: leftoverStatuses })
  @IsIn(leftoverStatuses)
  status!: (typeof leftoverStatuses)[number];
}
