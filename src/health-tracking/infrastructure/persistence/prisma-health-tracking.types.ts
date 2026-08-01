export interface PrismaBodyWeightRecord {
  id: string;
  adultProfileId: string;
  value: { toString(): string };
  unit: string;
  recordedAt: Date;
  source: string;
  correctedFromId: string | null;
}

export interface PrismaBodyMeasurementRecord {
  id: string;
  adultProfileId: string;
  type: string;
  customMeasurementName: string | null;
  value: { toString(): string };
  unit: string;
  recordedAt: Date;
  source: string;
  correctedFromId: string | null;
}

export interface PrismaCustomMeasurementRecord {
  id: string;
  configurationId: string;
  name: string;
  normalizedName: string;
  unit: string;
  enabled: boolean;
}

export interface PrismaMeasurementConfigurationRecord {
  id: string;
  adultProfileId: string;
  enabledTypes: string[];
  units: Record<string, string>;
  customMeasurements: PrismaCustomMeasurementRecord[];
}

export interface BodyWeightDelegate {
  findUnique(args: unknown): Promise<PrismaBodyWeightRecord | null>;
  findFirst(args: unknown): Promise<PrismaBodyWeightRecord | null>;
  findMany(args: unknown): Promise<PrismaBodyWeightRecord[]>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<PrismaBodyWeightRecord>;
}

export interface BodyMeasurementDelegate {
  findFirst(args: unknown): Promise<PrismaBodyMeasurementRecord | null>;
  findMany(args: unknown): Promise<PrismaBodyMeasurementRecord[]>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<PrismaBodyMeasurementRecord>;
}

export interface MeasurementConfigurationDelegate {
  findUnique(args: unknown): Promise<PrismaMeasurementConfigurationRecord | null>;
  upsert(args: unknown): Promise<PrismaMeasurementConfigurationRecord>;
}

export interface CustomMeasurementDelegate {
  deleteMany(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<PrismaCustomMeasurementRecord>;
}

export interface HealthTrackingPrismaClient {
  bodyWeightEntry: BodyWeightDelegate;
  bodyMeasurementEntry: BodyMeasurementDelegate;
  measurementConfiguration: MeasurementConfigurationDelegate;
  customMeasurementDefinition: CustomMeasurementDelegate;
}
