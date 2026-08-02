import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class PreparedBatchInventoryDecisionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ingredientId!: string;

  @ApiProperty({ enum: ['CONSUME', 'IGNORE'] })
  @IsIn(['CONSUME', 'IGNORE'])
  action!: 'CONSUME' | 'IGNORE';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;
}

export class ConfirmPreparedBatchInventoryConsumptionRequestDto {
  @ApiProperty({ type: [PreparedBatchInventoryDecisionDto] })
  decisions!: PreparedBatchInventoryDecisionDto[];
}

export class AddPreparedLeftoverToInventoryRequestDto {
  @ApiProperty({ example: 420, minimum: 0, exclusiveMinimum: true })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(Number.EPSILON)
  quantity!: number;

  @ApiPropertyOptional({ example: 'REFRIGERATOR', nullable: true })
  @IsOptional()
  location?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

export class PreparationInventoryCandidateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  foodId!: string | null;
  @ApiProperty({ example: '500.000' })
  quantity!: string;
  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT'] })
  unit!: string;
  @ApiProperty({ enum: ['ACTIVE', 'DEPLETED', 'ARCHIVED'] })
  status!: string;
  @ApiPropertyOptional({ nullable: true })
  location!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  expiresAt!: Date | null;
}

export class PreparedBatchInventoryIngredientPreviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  ingredientId!: string;

  @ApiProperty({ format: 'uuid' })
  foodId!: string;

  @ApiProperty({ example: '500.000' })
  quantity!: string;

  @ApiProperty({ enum: ['GRAM', 'MILLILITER', 'UNIT'] })
  unit!: string;

  @ApiProperty({ example: '500.000' })
  availableQuantity!: string;

  @ApiProperty({ enum: ['AVAILABLE', 'PARTIAL', 'UNAVAILABLE'] })
  availability!: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';

  @ApiProperty({ type: PreparationInventoryCandidateResponseDto, isArray: true })
  candidates!: PreparationInventoryCandidateResponseDto[];
}

export class PreparedBatchInventoryPreviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  batchId!: string;
  @ApiProperty({ type: PreparedBatchInventoryIngredientPreviewResponseDto, isArray: true })
  ingredients!: PreparedBatchInventoryIngredientPreviewResponseDto[];
}

export class ConfirmPreparedBatchInventoryConsumptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  batchId!: string;

  @ApiProperty({ enum: ['APPLIED', 'ALREADY_APPLIED'] })
  status!: 'APPLIED' | 'ALREADY_APPLIED';

  @ApiProperty({ description: 'Indica que una repeticion segura no aplicara el consumo otra vez.' })
  idempotent!: boolean;
}
