import { InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';
import { CustomMeasurementDefinitionProps } from '../models/health-tracking.models';
import { MeasurementUnit } from '../value-objects/health-tracking.value-objects';

export class CustomMeasurementDefinition {
  readonly name: string;
  readonly normalizedName: string;
  readonly unit: 'CM' | 'IN';
  enabled: boolean;

  constructor(input: { name: string; unit: 'CM' | 'IN'; enabled?: boolean }) {
    const name = input.name.trim().replace(/\s+/g, ' ');
    if (!name) throw new InvalidHealthTrackingValueError('Custom measurement name is required.');
    if (name.length > 100)
      throw new InvalidHealthTrackingValueError('Custom measurement name is too long.');
    MeasurementUnit.from(input.unit);
    this.name = name;
    this.normalizedName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
    this.unit = input.unit;
    this.enabled = input.enabled ?? true;
  }
  toProps(): CustomMeasurementDefinitionProps {
    return {
      name: this.name,
      normalizedName: this.normalizedName,
      unit: this.unit,
      enabled: this.enabled,
    };
  }
}
