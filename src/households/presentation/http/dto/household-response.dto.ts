import { ApiProperty } from '@nestjs/swagger';

export class HouseholdResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Hogar Sojo', maxLength: 150 })
  name!: string;

  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' })
  timezone!: string;

  @ApiProperty({ example: 'ARS' })
  currency!: string;

  @ApiProperty({ example: '125.50', nullable: true })
  weeklyBudget!: string | null;

  @ApiProperty({ format: 'uuid' })
  createdById!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
