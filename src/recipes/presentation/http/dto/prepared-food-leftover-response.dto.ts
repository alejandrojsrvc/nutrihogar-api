import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreparedFoodLeftoverResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  preparedBatchId!: string;

  @ApiProperty({ format: 'uuid' })
  householdId!: string;

  @ApiProperty({ example: 750 })
  availableWeight!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  nutrientDensitySnapshot!: Record<string, number>;

  @ApiProperty({ format: 'date-time' })
  storedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  storageLocation!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: ['AVAILABLE', 'CONSUMED', 'DISCARDED', 'EXPIRED'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
