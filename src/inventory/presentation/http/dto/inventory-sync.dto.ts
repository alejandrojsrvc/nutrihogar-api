import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import type { InventoryUnit } from '../../../domain/models/inventory.models';

const units: InventoryUnit[] = ['GRAM', 'MILLILITER', 'UNIT'];

export class InventorySyncOperationRequestDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() operationId!: string;
  @ApiProperty({ enum: ['MOVEMENT', 'ABSOLUTE_ADJUSTMENT'] })
  @IsIn(['MOVEMENT', 'ABSOLUTE_ADJUSTMENT'])
  type!: 'MOVEMENT' | 'ABSOLUTE_ADJUSTMENT';
  @ApiProperty({ format: 'uuid' }) @IsUUID() inventoryItemId!: string;
  @ApiPropertyOptional({
    enum: ['PURCHASE', 'CONSUMPTION', 'WASTE', 'EXPIRATION', 'REMAINDER_RETURN'],
  })
  @ValidateIf((o: InventorySyncOperationRequestDto) => o.type === 'MOVEMENT')
  @IsDefined()
  @IsIn(['PURCHASE', 'CONSUMPTION', 'WASTE', 'EXPIRATION', 'REMAINDER_RETURN'])
  movementType?: 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'EXPIRATION' | 'REMAINDER_RETURN';
  @ApiPropertyOptional({ minimum: 0 })
  @ValidateIf((o: InventorySyncOperationRequestDto) => o.type === 'MOVEMENT')
  @IsDefined()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(Number.EPSILON)
  quantity?: number;
  @ApiPropertyOptional({ minimum: 0 })
  @ValidateIf((o: InventorySyncOperationRequestDto) => o.type === 'ABSOLUTE_ADJUSTMENT')
  @IsDefined()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  newQuantity?: number;
  @ApiProperty({ enum: units }) @IsIn(units) unit!: InventoryUnit;
  @ApiProperty({ format: 'date-time' }) @IsDateString() occurredAt!: string;
  @ApiProperty() @IsInt() @Min(0) baseVersion!: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() allowLastWriteWins?: boolean;
}

export class InventorySyncRequestDto {
  @ApiProperty({ maxLength: 255 }) @IsString() deviceId!: string;
  @ApiProperty({ type: InventorySyncOperationRequestDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventorySyncOperationRequestDto)
  operations!: InventorySyncOperationRequestDto[];
}
