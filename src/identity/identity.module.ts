import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  AUTH_SESSION_REPOSITORY,
  AuthSessionRepository,
} from './application/ports/auth-session-repository.port';
import { ID_GENERATOR, IdGenerator } from './application/ports/id-generator.port';
import { IDENTITY_PROVIDER, IdentityProvider } from './application/ports/identity-provider.port';
import { PASSWORD_HASHER, PasswordHasher } from './application/ports/password-hasher.port';
import { TOKEN_HASHER, TokenHasher } from './application/ports/token-hasher.port';
import { TOKEN_PROVIDER, TokenProvider } from './application/ports/token-provider.port';
import { USER_REPOSITORY, UserRepository } from './application/ports/user-repository.port';
import { AuthenticationTokenService } from './application/services/authentication-token.service';
import {
  GET_CURRENT_USER_USE_CASE,
  GetCurrentUserUseCase,
} from './application/use-cases/get-current-user.use-case';
import { LOGIN_USE_CASE, LoginUseCase } from './application/use-cases/login.use-case';
import { LOGOUT_USE_CASE, LogoutUseCase } from './application/use-cases/logout.use-case';
import { REFRESH_USE_CASE, RefreshUseCase } from './application/use-cases/refresh.use-case';
import { REGISTER_USE_CASE, RegisterUseCase } from './application/use-cases/register.use-case';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password.hasher';
import { Sha256TokenHasher } from './infrastructure/security/sha256-token.hasher';
import { JwtTokenProvider } from './infrastructure/authentication/jwt-token.provider';
import { UuidGenerator } from './infrastructure/identifiers/uuid-generator';
import { PrismaAuthSessionRepository } from './infrastructure/persistence/prisma-auth-session.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { AuthController } from './presentation/http/auth.controller';
import { JwtAuthGuard } from './presentation/http/jwt-auth.guard';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, UsersController],
  providers: [
    { provide: IDENTITY_PROVIDER, useClass: JwtTokenProvider },
    { provide: TOKEN_PROVIDER, useExisting: JwtTokenProvider },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: AUTH_SESSION_REPOSITORY, useClass: PrismaAuthSessionRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_HASHER, useClass: Sha256TokenHasher },
    { provide: ID_GENERATOR, useClass: UuidGenerator },
    JwtTokenProvider,
    {
      provide: AuthenticationTokenService,
      inject: [TOKEN_PROVIDER, AUTH_SESSION_REPOSITORY, TOKEN_HASHER, ID_GENERATOR],
      useFactory: (
        tokens: TokenProvider,
        sessions: AuthSessionRepository,
        tokenHasher: TokenHasher,
        idGenerator: IdGenerator,
      ) => new AuthenticationTokenService(tokens, sessions, tokenHasher, idGenerator),
    },
    {
      provide: GET_CURRENT_USER_USE_CASE,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identityProvider: IdentityProvider, userRepository: UserRepository) =>
        new GetCurrentUserUseCase(identityProvider, userRepository),
    },
    {
      provide: REGISTER_USE_CASE,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, AuthenticationTokenService],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        authenticationTokens: AuthenticationTokenService,
      ) => new RegisterUseCase(userRepository, passwordHasher, authenticationTokens),
    },
    {
      provide: LOGIN_USE_CASE,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, AuthenticationTokenService],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        authenticationTokens: AuthenticationTokenService,
      ) => new LoginUseCase(userRepository, passwordHasher, authenticationTokens),
    },
    {
      provide: REFRESH_USE_CASE,
      inject: [
        USER_REPOSITORY,
        AUTH_SESSION_REPOSITORY,
        TOKEN_PROVIDER,
        TOKEN_HASHER,
        AuthenticationTokenService,
      ],
      useFactory: (
        userRepository: UserRepository,
        sessions: AuthSessionRepository,
        tokens: TokenProvider,
        tokenHasher: TokenHasher,
        authenticationTokens: AuthenticationTokenService,
      ) => new RefreshUseCase(userRepository, sessions, tokens, tokenHasher, authenticationTokens),
    },
    {
      provide: LOGOUT_USE_CASE,
      inject: [AUTH_SESSION_REPOSITORY, TOKEN_PROVIDER, TOKEN_HASHER],
      useFactory: (
        sessions: AuthSessionRepository,
        tokens: TokenProvider,
        tokenHasher: TokenHasher,
      ) => new LogoutUseCase(sessions, tokens, tokenHasher),
    },
    JwtAuthGuard,
  ],
  exports: [GET_CURRENT_USER_USE_CASE, JwtAuthGuard],
})
export class IdentityModule {}
