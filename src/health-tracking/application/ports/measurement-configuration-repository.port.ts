import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';

export const MEASUREMENT_CONFIGURATION_REPOSITORY = Symbol('MeasurementConfigurationRepository');

export interface MeasurementConfigurationRepository {
  findByAdult(adultProfileId: string): Promise<MeasurementConfiguration | null>;
  save(
    configuration: MeasurementConfiguration,
    adultProfileId: string,
  ): Promise<MeasurementConfiguration>;
}
