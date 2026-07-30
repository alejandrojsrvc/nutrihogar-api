import { Module } from '@nestjs/common';
import {
  GET_CURRENT_USER_USE_CASE,
  GetCurrentUserUseCase,
} from './application/use-cases/get-current-user.use-case';
import { IDENTITY_PROVIDER, IdentityProvider } from './application/ports/identity-provider.port';
import { USER_REPOSITORY, UserRepository } from './application/ports/user-repository.port';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { SupabaseIdentityProvider } from './infrastructure/supabase/supabase-identity.provider';
import { UsersController } from './presentation/http/users.controller';
import { SupabaseAuthGuard } from './presentation/http/supabase-auth.guard';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: IDENTITY_PROVIDER, useClass: SupabaseIdentityProvider },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: GET_CURRENT_USER_USE_CASE,
      inject: [IDENTITY_PROVIDER, USER_REPOSITORY],
      useFactory: (identityProvider: IdentityProvider, userRepository: UserRepository) =>
        new GetCurrentUserUseCase(identityProvider, userRepository),
    },
    SupabaseAuthGuard,
  ],
  exports: [GET_CURRENT_USER_USE_CASE, SupabaseAuthGuard],
})
export class IdentityModule {}
