import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { HouseholdsModule } from '../households/households.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import {
  BodyMeasurementRepository,
  BODY_MEASUREMENT_REPOSITORY,
} from './application/ports/body-measurement-repository.port';
import {
  BodyWeightRepository,
  BODY_WEIGHT_REPOSITORY,
} from './application/ports/body-weight-repository.port';
import {
  MeasurementConfigurationRepository,
  MEASUREMENT_CONFIGURATION_REPOSITORY,
} from './application/ports/measurement-configuration-repository.port';
import { PrismaBodyMeasurementRepository } from './infrastructure/persistence/prisma-body-measurement.repository';
import { PrismaBodyWeightRepository } from './infrastructure/persistence/prisma-body-weight.repository';
import { PrismaMeasurementConfigurationRepository } from './infrastructure/persistence/prisma-measurement-configuration.repository';
import { HealthTrackingController } from './presentation/http/health-tracking.controller';
import {
  CORRECT_BODY_MEASUREMENT_USE_CASE,
  CORRECT_BODY_WEIGHT_USE_CASE,
  CorrectBodyMeasurementUseCase,
  CorrectBodyWeightUseCase,
  GET_BODY_WEIGHT_ENTRY_QUERY,
  GET_LATEST_BODY_WEIGHT_QUERY,
  GET_MEASUREMENT_CONFIGURATION_QUERY,
  GetBodyWeightEntryQuery,
  GetLatestBodyWeightQuery,
  GetMeasurementConfigurationQuery,
  LIST_BODY_MEASUREMENTS_QUERY,
  LIST_BODY_WEIGHT_ENTRIES_QUERY,
  ListBodyMeasurementsQuery,
  ListBodyWeightEntriesQuery,
  REGISTER_BODY_MEASUREMENT_USE_CASE,
  REGISTER_BODY_WEIGHT_USE_CASE,
  RegisterBodyMeasurementUseCase,
  RegisterBodyWeightUseCase,
  UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE,
  UpdateMeasurementConfigurationUseCase,
} from './application/use-cases/health-tracking.use-cases';
import {
  ADULT_PROFILE_REPOSITORY,
  AdultProfileRepository,
} from '../households/application/adult-profile-ports/adult-profile-repository.port';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import { CLOCK, Clock } from '../nutrition/application/ports/clock.port';

@Module({
  imports: [IdentityModule, HouseholdsModule, NutritionModule],
  controllers: [HealthTrackingController],
  providers: [
    { provide: BODY_WEIGHT_REPOSITORY, useClass: PrismaBodyWeightRepository },
    { provide: BODY_MEASUREMENT_REPOSITORY, useClass: PrismaBodyMeasurementRepository },
    {
      provide: MEASUREMENT_CONFIGURATION_REPOSITORY,
      useClass: PrismaMeasurementConfigurationRepository,
    },
    {
      provide: REGISTER_BODY_WEIGHT_USE_CASE,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new RegisterBodyWeightUseCase(weights, { profiles, households, clock }),
    },
    {
      provide: CORRECT_BODY_WEIGHT_USE_CASE,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new CorrectBodyWeightUseCase(weights, { profiles, households, clock }),
    },
    {
      provide: GET_BODY_WEIGHT_ENTRY_QUERY,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new GetBodyWeightEntryQuery(weights, { profiles, households, clock }),
    },
    {
      provide: LIST_BODY_WEIGHT_ENTRIES_QUERY,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new ListBodyWeightEntriesQuery(weights, { profiles, households, clock }),
    },
    {
      provide: GET_LATEST_BODY_WEIGHT_QUERY,
      inject: [BODY_WEIGHT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        weights: BodyWeightRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new GetLatestBodyWeightQuery(weights, { profiles, households, clock }),
    },
    {
      provide: GET_MEASUREMENT_CONFIGURATION_QUERY,
      inject: [
        MEASUREMENT_CONFIGURATION_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        configurations: MeasurementConfigurationRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new GetMeasurementConfigurationQuery(configurations, { profiles, households, clock }),
    },
    {
      provide: UPDATE_MEASUREMENT_CONFIGURATION_USE_CASE,
      inject: [
        MEASUREMENT_CONFIGURATION_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        configurations: MeasurementConfigurationRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) =>
        new UpdateMeasurementConfigurationUseCase(configurations, { profiles, households, clock }),
    },
    {
      provide: REGISTER_BODY_MEASUREMENT_USE_CASE,
      inject: [
        BODY_MEASUREMENT_REPOSITORY,
        MEASUREMENT_CONFIGURATION_REPOSITORY,
        ADULT_PROFILE_REPOSITORY,
        HOUSEHOLD_REPOSITORY,
        CLOCK,
      ],
      useFactory: (
        measurements: BodyMeasurementRepository,
        configurations: MeasurementConfigurationRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) =>
        new RegisterBodyMeasurementUseCase(measurements, configurations, {
          profiles,
          households,
          clock,
        }),
    },
    {
      provide: CORRECT_BODY_MEASUREMENT_USE_CASE,
      inject: [BODY_MEASUREMENT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        measurements: BodyMeasurementRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new CorrectBodyMeasurementUseCase(measurements, { profiles, households, clock }),
    },
    {
      provide: LIST_BODY_MEASUREMENTS_QUERY,
      inject: [BODY_MEASUREMENT_REPOSITORY, ADULT_PROFILE_REPOSITORY, HOUSEHOLD_REPOSITORY, CLOCK],
      useFactory: (
        measurements: BodyMeasurementRepository,
        profiles: AdultProfileRepository,
        households: HouseholdRepository,
        clock: Clock,
      ) => new ListBodyMeasurementsQuery(measurements, { profiles, households, clock }),
    },
  ],
})
export class HealthTrackingModule {}
