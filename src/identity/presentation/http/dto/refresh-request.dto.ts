import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshRequestDto {
  @ApiProperty({ description: 'Refresh token returned during authentication.' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
