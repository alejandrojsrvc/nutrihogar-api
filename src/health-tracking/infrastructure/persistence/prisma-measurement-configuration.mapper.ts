import { MeasurementConfiguration } from '../../domain/entities/measurement-configuration';
import { MEASUREMENT_TYPES } from '../../domain/value-objects/health-tracking.value-objects';
import { PrismaMeasurementConfigurationRecord } from './prisma-health-tracking.types';

export class PrismaMeasurementConfigurationMapper {
  static toDomain(record: PrismaMeasurementConfigurationRecord): MeasurementConfiguration {
    const configuration = MeasurementConfiguration.createDefault(record.id);
    for (const type of MEASUREMENT_TYPES.filter(
      (item) => item !== 'CUSTOM' && !record.enabledTypes.includes(item),
    )) {
      configuration.disable(type);
    }
    for (const type of MEASUREMENT_TYPES.filter((item) => item !== 'CUSTOM')) {
      const unit = record.units[type];
      if (unit && unit !== 'CM') configuration.changeUnits(type, unit as 'CM' | 'IN');
    }
    for (const custom of record.customMeasurements) {
      const definition = configuration.addCustomMeasurement({
        name: custom.name,
        unit: custom.unit as 'CM' | 'IN',
      });
      definition.enabled = custom.enabled;
    }
    return configuration;
  }

  static toPersistence(configuration: MeasurementConfiguration) {
    const props = configuration.toProps();
    return {
      id: props.id,
      enabledTypes: props.enabledTypes,
      units: props.units,
      customMeasurements: props.customMeasurements,
    };
  }
}
