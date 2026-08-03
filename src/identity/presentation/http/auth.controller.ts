import {
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../../application/errors/authentication.errors';
import { LOGIN_USE_CASE, LoginUseCase } from '../../application/use-cases/login.use-case';
import { LOGOUT_USE_CASE, LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { REFRESH_USE_CASE, RefreshUseCase } from '../../application/use-cases/refresh.use-case';
import { REGISTER_USE_CASE, RegisterUseCase } from '../../application/use-cases/register.use-case';
import { AuthenticationResponseDto } from './dto/authentication-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { LogoutRequestDto } from './dto/logout-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USE_CASE)
    private readonly register: RegisterUseCase,
    @Inject(LOGIN_USE_CASE)
    private readonly login: LoginUseCase,
    @Inject(REFRESH_USE_CASE)
    private readonly refresh: RefreshUseCase,
    @Inject(LOGOUT_USE_CASE)
    private readonly logout: LogoutUseCase,
  ) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthenticationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid email or password.' })
  @ApiConflictResponse({ description: 'Email is already registered.' })
  async registerUser(@Body() body: RegisterRequestDto): Promise<AuthenticationResponseDto> {
    try {
      return await this.register.execute({
        email: body.email,
        password: body.password,
        displayName: body.displayName ?? null,
      });
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthenticationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  async loginUser(@Body() body: LoginRequestDto): Promise<AuthenticationResponseDto> {
    try {
      return await this.login.execute(body);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password.');
      }
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthenticationResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired or revoked refresh token.' })
  async refreshToken(@Body() body: RefreshRequestDto): Promise<AuthenticationResponseDto> {
    try {
      return await this.refresh.execute(body.refreshToken);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Session revoked.' })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired or revoked refresh token.' })
  async logoutUser(@Body() body: LogoutRequestDto): Promise<void> {
    try {
      await this.logout.execute(body.refreshToken);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }
      throw error;
    }
  }
}
