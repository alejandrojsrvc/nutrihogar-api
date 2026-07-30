import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  HOUSEHOLD_INVITATION_REPOSITORY,
  HouseholdInvitationRepository,
} from './application/invitation-ports/household-invitation-repository.port';
import {
  HOUSEHOLD_INVITATION_UNIT_OF_WORK,
  HouseholdInvitationUnitOfWork,
} from './application/invitation-ports/household-invitation-unit-of-work.port';
import {
  INVITATION_TOKEN_SERVICE,
  InvitationTokenService,
} from './application/invitation-ports/invitation-token-service.port';
import {
  ACCEPT_HOUSEHOLD_INVITATION_USE_CASE,
  AcceptHouseholdInvitationUseCase,
} from './application/invitation-use-cases/accept-household-invitation.use-case';
import {
  CANCEL_HOUSEHOLD_INVITATION_USE_CASE,
  CancelHouseholdInvitationUseCase,
} from './application/invitation-use-cases/cancel-household-invitation.use-case';
import {
  CREATE_HOUSEHOLD_INVITATION_USE_CASE,
  CreateHouseholdInvitationUseCase,
} from './application/invitation-use-cases/create-household-invitation.use-case';
import {
  LIST_HOUSEHOLD_INVITATIONS_USE_CASE,
  ListHouseholdInvitationsUseCase,
} from './application/invitation-use-cases/list-household-invitations.use-case';
import { HOUSEHOLD_REPOSITORY } from './application/ports/household-repository.port';
import { HouseholdRepository } from './application/ports/household-repository.port';
import { HOUSEHOLD_UNIT_OF_WORK } from './application/ports/household-unit-of-work.port';
import {
  CREATE_HOUSEHOLD_USE_CASE,
  CreateHouseholdUseCase,
} from './application/use-cases/create-household.use-case';
import {
  GET_HOUSEHOLD_USE_CASE,
  GetHouseholdUseCase,
} from './application/use-cases/get-household.use-case';
import {
  LIST_HOUSEHOLDS_USE_CASE,
  ListHouseholdsUseCase,
} from './application/use-cases/list-households.use-case';
import {
  UPDATE_HOUSEHOLD_USE_CASE,
  UpdateHouseholdUseCase,
} from './application/use-cases/update-household.use-case';
import { PrismaHouseholdRepository } from './infrastructure/persistence/prisma-household.repository';
import { PrismaHouseholdUnitOfWork } from './infrastructure/persistence/prisma-household-unit-of-work';
import { CryptoInvitationTokenService } from './infrastructure/invitation-persistence/crypto-invitation-token.service';
import { PrismaHouseholdInvitationRepository } from './infrastructure/invitation-persistence/prisma-household-invitation.repository';
import { PrismaHouseholdInvitationUnitOfWork } from './infrastructure/invitation-persistence/prisma-household-invitation.unit-of-work';
import { HouseholdInvitationsController } from './presentation/http/household-invitations.controller';
import { HouseholdsController } from './presentation/http/households.controller';

@Module({
  imports: [IdentityModule],
  controllers: [HouseholdsController, HouseholdInvitationsController],
  providers: [
    { provide: HOUSEHOLD_REPOSITORY, useClass: PrismaHouseholdRepository },
    { provide: HOUSEHOLD_UNIT_OF_WORK, useClass: PrismaHouseholdUnitOfWork },
    {
      provide: HOUSEHOLD_INVITATION_REPOSITORY,
      useClass: PrismaHouseholdInvitationRepository,
    },
    {
      provide: HOUSEHOLD_INVITATION_UNIT_OF_WORK,
      useClass: PrismaHouseholdInvitationUnitOfWork,
    },
    {
      provide: INVITATION_TOKEN_SERVICE,
      useClass: CryptoInvitationTokenService,
    },
    {
      provide: CREATE_HOUSEHOLD_USE_CASE,
      inject: [HOUSEHOLD_UNIT_OF_WORK],
      useFactory: (unitOfWork: PrismaHouseholdUnitOfWork) =>
        new CreateHouseholdUseCase(unitOfWork),
    },
    {
      provide: LIST_HOUSEHOLDS_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY],
      useFactory: (households: PrismaHouseholdRepository) =>
        new ListHouseholdsUseCase(households),
    },
    {
      provide: GET_HOUSEHOLD_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY],
      useFactory: (households: PrismaHouseholdRepository) =>
        new GetHouseholdUseCase(households),
    },
    {
      provide: UPDATE_HOUSEHOLD_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY],
      useFactory: (households: PrismaHouseholdRepository) =>
        new UpdateHouseholdUseCase(households),
    },
    {
      provide: CREATE_HOUSEHOLD_INVITATION_USE_CASE,
      inject: [
        HOUSEHOLD_REPOSITORY,
        HOUSEHOLD_INVITATION_REPOSITORY,
        INVITATION_TOKEN_SERVICE,
      ],
      useFactory: (
        households: HouseholdRepository,
        invitations: HouseholdInvitationRepository,
        tokenService: InvitationTokenService,
      ) =>
        new CreateHouseholdInvitationUseCase(
          households,
          invitations,
          tokenService,
        ),
    },
    {
      provide: LIST_HOUSEHOLD_INVITATIONS_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, HOUSEHOLD_INVITATION_REPOSITORY],
      useFactory: (
        households: HouseholdRepository,
        invitations: HouseholdInvitationRepository,
      ) => new ListHouseholdInvitationsUseCase(households, invitations),
    },
    {
      provide: ACCEPT_HOUSEHOLD_INVITATION_USE_CASE,
      inject: [
        HOUSEHOLD_INVITATION_REPOSITORY,
        HOUSEHOLD_INVITATION_UNIT_OF_WORK,
        INVITATION_TOKEN_SERVICE,
      ],
      useFactory: (
        invitations: HouseholdInvitationRepository,
        unitOfWork: HouseholdInvitationUnitOfWork,
        tokenService: InvitationTokenService,
      ) =>
        new AcceptHouseholdInvitationUseCase(
          invitations,
          unitOfWork,
          tokenService,
        ),
    },
    {
      provide: CANCEL_HOUSEHOLD_INVITATION_USE_CASE,
      inject: [HOUSEHOLD_REPOSITORY, HOUSEHOLD_INVITATION_REPOSITORY],
      useFactory: (
        households: HouseholdRepository,
        invitations: HouseholdInvitationRepository,
      ) => new CancelHouseholdInvitationUseCase(households, invitations),
    },
  ],
})
export class HouseholdsModule {}
