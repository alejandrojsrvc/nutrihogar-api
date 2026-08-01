import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type {
  InventoryItemStatus,
  InventoryItemType,
  InventoryUnit,
} from '../../../domain/models/inventory.models';

const itemTypes: InventoryItemType[] = ['FOOD', 'PREPARED_FOOD', 'CUSTOM'];
const statuses: InventoryItemStatus[] = ['ACTIVE', 'DEPLETED', 'ARCHIVED'];
const units: InventoryUnit[] = ['GRAM', 'MILLILITER', 'UNIT'];

export class ListInventoryItemsRequestDto {
  @ApiPropertyOptional({ example: 'arroz' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: itemTypes })
  @IsOptional()
  @IsIn(itemTypes)
  itemType?: InventoryItemType;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: InventoryItemStatus;

  @ApiPropertyOptional({ example: 'Pantry' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  belowMinimum?: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  expiresBefore?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class PaginationRequestDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class CreateManualInventoryItemRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  foodId!: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 12 })
  @Min(0)
  quantity!: number;

  @ApiProperty({ enum: units })
  @IsIn(units)
  unit!: InventoryUnit;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 12 })
  @Min(0)
  minimumQuantity?: number | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class UpdateInventoryItemRequestDto {
  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 12 })
  @Min(0)
  minimumQuantity?: number | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsDateString()
  expiresAt?: string | null;
}

export class AdjustInventoryItemRequestDto {
  @ApiProperty({ minimum: 0 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 12 })
  @Min(0)
  quantity!: number;

  @ApiProperty({ enum: units })
  @IsIn(units)
  unit!: InventoryUnit;

  @ApiProperty({ minLength: 1, maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class RegisterInventoryExitRequestDto {
  @ApiProperty({ minimum: 0 })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 12 })
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiProperty({ enum: units })
  @IsIn(units)
  unit!: InventoryUnit;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
