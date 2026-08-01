import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

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

export class PreparationInventoryCandidateResponseDto {
  id!: string;
  foodId!: string | null;
  quantity!: string;
  unit!: string;
  status!: string;
  location!: string | null;
  expiresAt!: Date | null;
}

export class PreparedBatchInventoryPreviewResponseDto {
  batchId!: string;
  ingredients!: Array<{
    ingredientId: string;
    foodId: string;
    quantity: string;
    unit: string;
    candidates: PreparationInventoryCandidateResponseDto[];
  }>;
}
