import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HouseholdsModule } from '../households/households.module';
import { IdentityModule } from '../identity/identity.module';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../households/application/ports/household-repository.port';
import { EXPORTS_READ_REPOSITORY } from './application/ports/exports-read-repository.port';
import {
  EXPORT_BODY_TRACKING_CSV_USE_CASE,
  EXPORT_DIGESTIVE_SYMPTOMS_CSV_USE_CASE,
  EXPORT_INVENTORY_MOVEMENTS_CSV_USE_CASE,
  EXPORT_NUTRITION_REPORT_CSV_USE_CASE,
  EXPORT_PURCHASES_CSV_USE_CASE,
  ExportBodyTrackingCsvUseCase,
  ExportDigestiveSymptomsCsvUseCase,
  ExportInventoryMovementsCsvUseCase,
  ExportNutritionReportCsvUseCase,
  ExportPurchasesCsvUseCase,
} from './application/use-cases/export-csv.use-cases';
import { PrismaExportsReadRepository } from './infrastructure/persistence/prisma-exports-read.repository';
import { ExportsController } from './presentation/http/exports.controller';
import type { ExportsReadRepository } from './application/ports/exports-read-repository.port';

@Module({
  imports: [DatabaseModule, IdentityModule, HouseholdsModule],
  controllers: [ExportsController],
  providers: [
    { provide: EXPORTS_READ_REPOSITORY, useClass: PrismaExportsReadRepository },
    {
      provide: EXPORT_BODY_TRACKING_CSV_USE_CASE,
      inject: [EXPORTS_READ_REPOSITORY],
      useFactory: (repository: ExportsReadRepository) =>
        new ExportBodyTrackingCsvUseCase(repository),
    },
    {
      provide: EXPORT_NUTRITION_REPORT_CSV_USE_CASE,
      inject: [EXPORTS_READ_REPOSITORY],
      useFactory: (repository: ExportsReadRepository) =>
        new ExportNutritionReportCsvUseCase(repository),
    },
    {
      provide: EXPORT_DIGESTIVE_SYMPTOMS_CSV_USE_CASE,
      inject: [EXPORTS_READ_REPOSITORY],
      useFactory: (repository: ExportsReadRepository) =>
        new ExportDigestiveSymptomsCsvUseCase(repository),
    },
    {
      provide: EXPORT_INVENTORY_MOVEMENTS_CSV_USE_CASE,
      inject: [EXPORTS_READ_REPOSITORY, HOUSEHOLD_REPOSITORY],
      useFactory: (repository: ExportsReadRepository, households: HouseholdRepository) =>
        new ExportInventoryMovementsCsvUseCase(repository, households),
    },
    {
      provide: EXPORT_PURCHASES_CSV_USE_CASE,
      inject: [EXPORTS_READ_REPOSITORY, HOUSEHOLD_REPOSITORY],
      useFactory: (repository: ExportsReadRepository, households: HouseholdRepository) =>
        new ExportPurchasesCsvUseCase(repository, households),
    },
  ],
})
export class ExportsModule {}
