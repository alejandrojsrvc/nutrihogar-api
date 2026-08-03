import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class OperationalReportQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({ example: '2026-08-31' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;
}

export class OperationalReportResponseDto {
  @ApiProperty() period!: { from: string; to: string };
  @ApiPropertyOptional() data?: unknown;
}
