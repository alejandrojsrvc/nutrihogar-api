import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { HouseholdsModule } from '../households/households.module';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import {
  OPERATIONAL_REPORT_REPOSITORY,
  OperationalReportRepository,
} from './application/ports/operational-report-repository.port';
import {
  GET_INVENTORY_REPORT_QUERY,
  GET_PURCHASE_REPORT_QUERY,
  GET_WASTE_REPORT_QUERY,
  GetInventoryReportQuery,
  GetPurchaseReportQuery,
  GetWasteReportQuery,
} from './application/queries/get-operational-reports.query';
import {
  NUTRITION_REPORT_REPOSITORY,
  NutritionReportRepository,
} from './application/ports/nutrition-report-repository.port';
import {
  GET_DAILY_NUTRITION_REPORT_QUERY,
  GET_WEEKLY_NUTRITION_REPORT_QUERY,
  GetDailyNutritionReportQuery,
  GetWeeklyNutritionReportQuery,
} from './application/use-cases/get-nutrition-reports.query';
import { PrismaNutritionReportRepository } from './infrastructure/persistence/prisma-nutrition-report.repository';
import { NutritionReportsController } from './presentation/http/nutrition-reports.controller';
import { ReportsController } from './presentation/http/reports.controller';

@Module({
  imports: [DatabaseModule, IdentityModule, HouseholdsModule],
  controllers: [NutritionReportsController, ReportsController],
  providers: [
    { provide: NUTRITION_REPORT_REPOSITORY, useClass: PrismaNutritionReportRepository },
    { provide: OPERATIONAL_REPORT_REPOSITORY, useExisting: NUTRITION_REPORT_REPOSITORY },
    {
      provide: GET_DAILY_NUTRITION_REPORT_QUERY,
      inject: [NUTRITION_REPORT_REPOSITORY],
      useFactory: (repository: NutritionReportRepository) =>
        new GetDailyNutritionReportQuery(repository),
    },
    {
      provide: GET_WEEKLY_NUTRITION_REPORT_QUERY,
      inject: [NUTRITION_REPORT_REPOSITORY],
      useFactory: (repository: NutritionReportRepository) =>
        new GetWeeklyNutritionReportQuery(repository),
    },
    {
      provide: GET_INVENTORY_REPORT_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, OPERATIONAL_REPORT_REPOSITORY],
      useFactory: (households: HouseholdRepository, reports: OperationalReportRepository) =>
        new GetInventoryReportQuery(households, reports),
    },
    {
      provide: GET_PURCHASE_REPORT_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, OPERATIONAL_REPORT_REPOSITORY],
      useFactory: (households: HouseholdRepository, reports: OperationalReportRepository) =>
        new GetPurchaseReportQuery(households, reports),
    },
    {
      provide: GET_WASTE_REPORT_QUERY,
      inject: [HOUSEHOLD_REPOSITORY, OPERATIONAL_REPORT_REPOSITORY],
      useFactory: (households: HouseholdRepository, reports: OperationalReportRepository) =>
        new GetWasteReportQuery(households, reports),
    },
  ],
})
export class ReportsModule {}
