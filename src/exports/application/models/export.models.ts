export interface CsvDocument {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
}

export interface ExportDateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface ExportQuery {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly timezone?: string;
  readonly locale?: string;
}

export interface ExportProfile {
  readonly id: string;
  readonly householdId: string;
  readonly timezone: string | null;
}

export interface BodyTrackingExportRow {
  readonly recordedAt: Date;
  readonly kind: 'weight' | 'measurement';
  readonly name: string;
  readonly value: string;
  readonly unit: string;
}

export interface NutritionExportRow {
  readonly consumedAt: Date;
  readonly mealType: string;
  readonly itemName: string;
  readonly quantity: string;
  readonly quantityUnit: string;
  readonly nutrientCode: string;
  readonly nutrientName: string;
  readonly amount: string;
  readonly nutrientUnit: string;
}

export interface DigestiveSymptomsExportRow {
  readonly startAt: Date;
  readonly endAt: Date | null;
  readonly type: string;
  readonly intensity: number;
  readonly status: string;
  readonly notes: string | null;
}

export interface InventoryMovementExportRow {
  readonly occurredAt: Date;
  readonly itemName: string;
  readonly movementType: string;
  readonly quantity: string;
  readonly unit: string;
  readonly reason: string | null;
}

export interface PurchaseExportRow {
  readonly purchaseDate: Date;
  readonly storeName: string;
  readonly status: string;
  readonly currency: string;
  readonly total: string;
  readonly itemName: string;
  readonly quantity: string;
  readonly unit: string;
}
