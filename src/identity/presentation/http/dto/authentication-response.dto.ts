import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserResponseDto } from './current-user-response.dto';

export class AuthenticationResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token.' })
  accessToken!: string;

  @ApiProperty({ description: 'Rotating refresh token.' })
  refreshToken!: string;

  @ApiProperty({ type: CurrentUserResponseDto })
  user!: CurrentUserResponseDto;
}
