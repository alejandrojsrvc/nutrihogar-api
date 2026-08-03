import type { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import type { ExportQuery } from '../models/export.models';
import { ExportAccessDeniedError } from '../errors/export.errors';
import type { ExportsReadRepository } from '../ports/exports-read-repository.port';
import { CsvSerializer } from '../utils/csv-serializer';
import { toExportDateRange } from '../utils/export-date-range';

export const EXPORT_BODY_TRACKING_CSV_USE_CASE = Symbol('ExportBodyTrackingCsvUseCase');
export const EXPORT_NUTRITION_REPORT_CSV_USE_CASE = Symbol('ExportNutritionReportCsvUseCase');
export const EXPORT_DIGESTIVE_SYMPTOMS_CSV_USE_CASE = Symbol('ExportDigestiveSymptomsCsvUseCase');
export const EXPORT_INVENTORY_MOVEMENTS_CSV_USE_CASE = Symbol('ExportInventoryMovementsCsvUseCase');
export const EXPORT_PURCHASES_CSV_USE_CASE = Symbol('ExportPurchasesCsvUseCase');

abstract class ProfileExport {
  constructor(protected readonly repository: ExportsReadRepository) {}
  protected async profile(actorId: string, profileId: string) {
    const profile = await this.repository.findAccessibleProfile(actorId, profileId);
    if (!profile) throw new ExportAccessDeniedError();
    return profile;
  }
}

export class ExportBodyTrackingCsvUseCase extends ProfileExport {
  async execute(input: {
    actorId: string;
    profileId: string;
    query: ExportQuery;
  }): Promise<string> {
    const profile = await this.profile(input.actorId, input.profileId);
    const rows = await this.repository.listBodyTracking(
      input.profileId,
      toExportDateRange(input.query, profile.timezone),
    );
    return CsvSerializer.serialize({
      headers: ['recorded_at', 'measurement', 'value', 'unit'],
      rows: rows.map((row) => [row.recordedAt.toISOString(), row.name, row.value, row.unit]),
    });
  }
}

export class ExportNutritionReportCsvUseCase extends ProfileExport {
  async execute(input: {
    actorId: string;
    profileId: string;
    query: ExportQuery;
  }): Promise<string> {
    const profile = await this.profile(input.actorId, input.profileId);
    const rows = await this.repository.listNutrition(
      input.profileId,
      toExportDateRange(input.query, profile.timezone),
    );
    return CsvSerializer.serialize({
      headers: [
        'consumed_at',
        'meal_type',
        'item',
        'quantity',
        'quantity_unit',
        'nutrient_code',
        'nutrient',
        'amount',
        'nutrient_unit',
      ],
      rows: rows.map((row) => [
        row.consumedAt.toISOString(),
        row.mealType,
        row.itemName,
        row.quantity,
        row.quantityUnit,
        row.nutrientCode,
        row.nutrientName,
        row.amount,
        row.nutrientUnit,
      ]),
    });
  }
}

export class ExportDigestiveSymptomsCsvUseCase extends ProfileExport {
  async execute(input: {
    actorId: string;
    profileId: string;
    query: ExportQuery;
  }): Promise<string> {
    const profile = await this.profile(input.actorId, input.profileId);
    const rows = await this.repository.listDigestiveSymptoms(
      input.profileId,
      toExportDateRange(input.query, profile.timezone),
    );
    return CsvSerializer.serialize({
      headers: ['start_at', 'end_at', 'symptom', 'intensity', 'status', 'notes'],
      rows: rows.map((row) => [
        row.startAt.toISOString(),
        row.endAt?.toISOString() ?? '',
        row.type,
        row.intensity,
        row.status,
        row.notes,
      ]),
    });
  }
}

abstract class HouseholdAdminExport {
  constructor(
    protected readonly repository: ExportsReadRepository,
    protected readonly households: HouseholdRepository,
  ) {}
  protected async authorize(actorId: string, householdId: string) {
    const access = await this.households.findAccess(actorId, householdId);
    if (!access || access.status !== 'ACTIVE' || access.role !== 'ADMIN')
      throw new ExportAccessDeniedError();
    return access;
  }
}

export class ExportInventoryMovementsCsvUseCase extends HouseholdAdminExport {
  async execute(input: {
    actorId: string;
    householdId: string;
    query: ExportQuery;
  }): Promise<string> {
    const access = await this.authorize(input.actorId, input.householdId);
    const rows = await this.repository.listInventoryMovements(
      input.householdId,
      toExportDateRange(input.query, access.household.timezone),
    );
    return CsvSerializer.serialize({
      headers: ['occurred_at', 'item', 'movement_type', 'quantity', 'unit', 'reason'],
      rows: rows.map((row) => [
        row.occurredAt.toISOString(),
        row.itemName,
        row.movementType,
        row.quantity,
        row.unit,
        row.reason,
      ]),
    });
  }
}

export class ExportPurchasesCsvUseCase extends HouseholdAdminExport {
  async execute(input: {
    actorId: string;
    householdId: string;
    query: ExportQuery;
  }): Promise<string> {
    const access = await this.authorize(input.actorId, input.householdId);
    const rows = await this.repository.listPurchases(
      input.householdId,
      toExportDateRange(input.query, access.household.timezone),
    );
    return CsvSerializer.serialize({
      headers: [
        'purchase_date',
        'store',
        'status',
        'currency',
        'total',
        'item',
        'quantity',
        'unit',
      ],
      rows: rows.map((row) => [
        row.purchaseDate.toISOString(),
        row.storeName,
        row.status,
        row.currency,
        row.total,
        row.itemName,
        row.quantity,
        row.unit,
      ]),
    });
  }
}
