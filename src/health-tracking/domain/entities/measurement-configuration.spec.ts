import { MeasurementConfiguration } from './measurement-configuration';
import { DuplicateCustomMeasurementError, InvalidHealthTrackingValueError } from '../errors/health-tracking.errors';

describe('MeasurementConfiguration', () => {
  it('starts with standard measurements enabled in centimeters', () => {
    const config = MeasurementConfiguration.createDefault('config-1');
    expect(config.isEnabled('WAIST')).toBe(true);
    expect(config.isEnabled('CUSTOM', 'neck circumference')).toBe(false);
    expect(config.toProps().units.WAIST).toBe('CM');
  });

  it('enables, disables and changes standard units', () => {
    const config = MeasurementConfiguration.createDefault('config-1');
    config.disable('CHEST');
    expect(config.isEnabled('CHEST')).toBe(false);
    config.enable('CHEST');
    config.changeUnits('CHEST', 'IN');
    expect(config.isEnabled('CHEST')).toBe(true);
    expect(config.toProps().units.CHEST).toBe('IN');
  });

  it('normalizes custom names, rejects duplicates and removes them', () => {
    const config = MeasurementConfiguration.createDefault('config-1');
    config.addCustomMeasurement({ name: '  Upper  Arm ', unit: 'CM' });
    expect(config.isEnabled('CUSTOM', 'upper arm')).toBe(true);
    expect(() => config.addCustomMeasurement('UPPER ARM')).toThrow(DuplicateCustomMeasurementError);
    config.removeCustomMeasurement('upper arm');
    expect(config.isEnabled('CUSTOM', 'Upper Arm')).toBe(false);
  });

  it('rejects invalid custom names and invalid custom unit changes', () => {
    const config = MeasurementConfiguration.createDefault('config-1');
    expect(() => config.addCustomMeasurement('   ')).toThrow(InvalidHealthTrackingValueError);
    expect(() => config.changeUnits('CUSTOM', 'CM')).toThrow(InvalidHealthTrackingValueError);
  });
});
