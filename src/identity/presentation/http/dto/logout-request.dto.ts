import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({ description: 'Refresh token of the session to revoke.' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
