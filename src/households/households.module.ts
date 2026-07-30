import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { HOUSEHOLD_REPOSITORY } from './application/ports/household-repository.port';
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
import { HouseholdsController } from './presentation/http/households.controller';

@Module({
  imports: [IdentityModule],
  controllers: [HouseholdsController],
  providers: [
    { provide: HOUSEHOLD_REPOSITORY, useClass: PrismaHouseholdRepository },
    { provide: HOUSEHOLD_UNIT_OF_WORK, useClass: PrismaHouseholdUnitOfWork },
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
  ],
})
export class HouseholdsModule {}
