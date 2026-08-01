import { CustomMeasurementDefinition } from './custom-measurement-definition';
import { CustomMeasurementNotFoundError, DuplicateCustomMeasurementError, InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';
import { MeasurementConfigurationProps } from '../models/health-tracking.models';
import { MEASUREMENT_TYPES, MeasurementConfigurationId, MeasurementTypeValue, MeasurementUnit } from '../value-objects/health-tracking.value-objects';

const standardTypes = MEASUREMENT_TYPES.filter((type) => type !== 'CUSTOM');
export class MeasurementConfiguration {
  private constructor(private readonly id: string, private readonly enabledTypes: Set<MeasurementTypeValue>, private readonly units: Map<MeasurementTypeValue, 'CM' | 'IN'>, private readonly customMeasurements: Map<string, CustomMeasurementDefinition>) {}
  static createDefault(id: string): MeasurementConfiguration {
    return new MeasurementConfiguration(new MeasurementConfigurationId(id).value, new Set(standardTypes), new Map(standardTypes.map((type) => [type, 'CM'])), new Map());
  }
  enable(type: MeasurementTypeValue): void { this.ensureType(type); this.enabledTypes.add(type); }
  disable(type: MeasurementTypeValue): void { this.ensureType(type); this.enabledTypes.delete(type); }
  isEnabled(type: MeasurementTypeValue, customName?: string): boolean { if (type === 'CUSTOM') return !!customName && this.customMeasurements.get(this.normalize(customName))?.enabled === true; return this.enabledTypes.has(type); }
  addCustomMeasurement(input: string | { name: string; unit?: 'CM' | 'IN' }): CustomMeasurementDefinition {
    const definition = new CustomMeasurementDefinition({ name: typeof input === 'string' ? input : input.name, unit: typeof input === 'string' ? 'CM' : input.unit ?? 'CM' });
    if (this.customMeasurements.has(definition.normalizedName)) throw new DuplicateCustomMeasurementError(definition.name);
    this.customMeasurements.set(definition.normalizedName, definition);
    return definition;
  }
  removeCustomMeasurement(name: string): void { const key = this.normalize(name); if (!this.customMeasurements.delete(key)) throw new CustomMeasurementNotFoundError(name); }
  changeUnits(type: MeasurementTypeValue, unit: 'CM' | 'IN'): void { MeasurementUnit.from(unit); if (type === 'CUSTOM') throw new InvalidHealthTrackingValueError('Custom units are changed by custom measurement definition.'); this.ensureType(type); this.units.set(type, unit); }
  toProps(): MeasurementConfigurationProps { return { id: this.id, enabledTypes: [...this.enabledTypes], units: Object.fromEntries(this.units), customMeasurements: [...this.customMeasurements.values()].map((definition) => definition.toProps()) }; }
  private ensureType(type: MeasurementTypeValue): void { if (!MEASUREMENT_TYPES.includes(type)) throw new InvalidHealthTrackingValueError('Invalid measurement type.'); if (type === 'CUSTOM') throw new InvalidHealthTrackingValueError('Use custom measurement methods for CUSTOM.'); }
  private normalize(name: string): string { return new CustomMeasurementDefinition({ name, unit: 'CM' }).normalizedName; }
}
