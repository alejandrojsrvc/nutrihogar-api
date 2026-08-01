import { BodyMeasurementEntry } from '../../domain/entities/body-measurement-entry';
import { MeasurementTypeValue } from '../../domain/value-objects/health-tracking.value-objects';

export const BODY_MEASUREMENT_REPOSITORY = Symbol('BodyMeasurementRepository');

export interface BodyMeasurementListFilters {
  type?: MeasurementTypeValue;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export interface BodyMeasurementPage {
  items: BodyMeasurementEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface BodyMeasurementRepository {
  findById(id: string, adultProfileId?: string): Promise<BodyMeasurementEntry | null>;
  save(entry: BodyMeasurementEntry): Promise<BodyMeasurementEntry>;
  saveMany(entries: BodyMeasurementEntry[]): Promise<BodyMeasurementEntry[]>;
  listByAdult(
    adultProfileId: string,
    filters: BodyMeasurementListFilters,
  ): Promise<BodyMeasurementPage>;
}
