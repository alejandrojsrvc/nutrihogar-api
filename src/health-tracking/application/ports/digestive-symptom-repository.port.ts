import { DigestiveSymptomEntry } from '../../domain/entities/digestive-symptom-entry';
import {
  DigestiveSymptomTypeValue,
  SymptomStatusValue,
} from '../../domain/value-objects/digestive-symptom.value-objects';

export const DIGESTIVE_SYMPTOM_REPOSITORY = Symbol('DigestiveSymptomRepository');

export interface DigestiveSymptomListFilters {
  type?: DigestiveSymptomTypeValue;
  status?: SymptomStatusValue;
  intensity?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}
export type DigestiveSymptomInsightFilters = Pick<
  DigestiveSymptomListFilters,
  'dateFrom' | 'dateTo' | 'type'
>;
export interface DigestiveSymptomPage {
  items: DigestiveSymptomEntry[];
  page: number;
  limit: number;
  total: number;
}
export interface DigestiveSymptomRepository {
  findById(id: string): Promise<DigestiveSymptomEntry | null>;
  save(entry: DigestiveSymptomEntry): Promise<DigestiveSymptomEntry>;
  saveCorrection?(
    original: DigestiveSymptomEntry,
    corrected: DigestiveSymptomEntry,
  ): Promise<DigestiveSymptomEntry>;
  listByAdult(
    adultProfileId: string,
    filters: DigestiveSymptomListFilters,
  ): Promise<DigestiveSymptomPage>;
  listForInsights(
    adultProfileId: string,
    filters: DigestiveSymptomInsightFilters,
  ): Promise<DigestiveSymptomEntry[]>;
}
