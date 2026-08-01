import Decimal from 'decimal.js';
import { MeasurementSourceValue, MeasurementTypeValue, MeasurementUnitValue } from '../value-objects/health-tracking.value-objects';

export interface BodyWeightEntryProps {
  id: string; adultProfileId: string; value: Decimal; unit: 'KG' | 'LB'; recordedAt: Date; source: MeasurementSourceValue; correctedFromId: string | null;
}
export interface BodyMeasurementEntryProps {
  id: string; adultProfileId: string; type: MeasurementTypeValue; customMeasurementName: string | null; value: Decimal; unit: 'CM' | 'IN'; recordedAt: Date; source: MeasurementSourceValue; correctedFromId: string | null;
}
export interface CustomMeasurementDefinitionProps {
  name: string; normalizedName: string; unit: 'CM' | 'IN'; enabled: boolean;
}
export interface MeasurementConfigurationProps {
  id: string; enabledTypes: MeasurementTypeValue[]; units: Partial<Record<MeasurementTypeValue, MeasurementUnitValue>>; customMeasurements: CustomMeasurementDefinitionProps[];
}
