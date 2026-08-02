import type {
  BodyTrackingExportRow,
  DigestiveSymptomsExportRow,
  ExportDateRange,
  ExportProfile,
  InventoryMovementExportRow,
  NutritionExportRow,
  PurchaseExportRow,
} from '../models/export.models';

export const EXPORTS_READ_REPOSITORY = Symbol('ExportsReadRepository');

export interface BodyTrackingExportReadPort {
  findAccessibleProfile(actorId: string, profileId: string): Promise<ExportProfile | null>;
  listBodyTracking(profileId: string, range: ExportDateRange): Promise<BodyTrackingExportRow[]>;
}

export interface NutritionExportReadPort {
  findAccessibleProfile(actorId: string, profileId: string): Promise<ExportProfile | null>;
  listNutrition(profileId: string, range: ExportDateRange): Promise<NutritionExportRow[]>;
}

export interface DigestiveSymptomsExportReadPort {
  findAccessibleProfile(actorId: string, profileId: string): Promise<ExportProfile | null>;
  listDigestiveSymptoms(
    profileId: string,
    range: ExportDateRange,
  ): Promise<DigestiveSymptomsExportRow[]>;
}

export interface InventoryMovementsExportReadPort {
  listInventoryMovements(
    householdId: string,
    range: ExportDateRange,
  ): Promise<InventoryMovementExportRow[]>;
}

export interface PurchasesExportReadPort {
  listPurchases(householdId: string, range: ExportDateRange): Promise<PurchaseExportRow[]>;
}

export interface ExportsReadRepository
  extends
    BodyTrackingExportReadPort,
    NutritionExportReadPort,
    DigestiveSymptomsExportReadPort,
    InventoryMovementsExportReadPort,
    PurchasesExportReadPort {}
