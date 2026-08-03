import { BodyWeightEntry } from '../../domain/entities/body-weight-entry';

export const BODY_WEIGHT_REPOSITORY = Symbol('BodyWeightRepository');

export interface BodyWeightListFilters {
  dateFrom?: Date;
  dateTo?: Date;
  unit?: 'KG' | 'LB';
  page: number;
  limit: number;
}
export type BodyWeightProgressFilters = Pick<BodyWeightListFilters, 'dateFrom' | 'dateTo'>;

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
  listForProgress(
    adultProfileId: string,
    filters: BodyWeightProgressFilters,
  ): Promise<BodyWeightEntry[]>;
}
