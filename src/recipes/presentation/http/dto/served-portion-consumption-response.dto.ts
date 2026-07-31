import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmServedPortionConsumptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  portionId!: string;

  @ApiProperty({ format: 'uuid' })
  adultProfileId!: string;

  @ApiProperty({ example: 520 })
  servedWeight!: number;

  @ApiProperty({ example: 480 })
  consumedWeight!: number;

  @ApiPropertyOptional({ example: 40, nullable: true })
  remainderWeight!: number | null;

  @ApiPropertyOptional({ enum: ['SAVED', 'DISCARDED', 'SHARED', 'CONSUMED_LATER'], nullable: true })
  remainderDisposition!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mealId!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  nutrients!: Record<string, number>;
}
