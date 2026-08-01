import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';

export const BODY_WEIGHT_REPOSITORY = Symbol('BodyWeightRepository');

export interface BodyWeightListFilters {
  dateFrom?: Date;
  dateTo?: Date;
  unit?: 'KG' | 'LB';
  page: number;
  limit: number;
}

export interface BodyWeightPage {
  items: BodyWeightEntry[];
  page: number;
  limit: number;
  total: number;
}

export interface BodyWeightRepository {
  findById(id: string, adultProfileId?: string): Promise<BodyWeightEntry | null>;
  save(entry: BodyWeightEntry): Promise<BodyWeightEntry>;
  listByAdult(adultProfileId: string, filters: BodyWeightListFilters): Promise<BodyWeightPage>;
  findLatest(adultProfileId: string): Promise<BodyWeightEntry | null>;
}
