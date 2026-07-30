import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from './current-user.decorator';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { CurrentUser as CurrentUserModel } from '../../application/models/current-user';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired access token.',
  })
  getCurrentUser(
    @CurrentUser() user: CurrentUserModel,
  ): CurrentUserResponseDto {
    return user;
  }
}
