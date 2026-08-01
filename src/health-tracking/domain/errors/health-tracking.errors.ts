export class InvalidHealthTrackingValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidHealthTrackingValueError.name;
  }
}

export class DuplicateCustomMeasurementError extends Error {
  constructor(name: string) {
    super(`A custom measurement named "${name}" already exists.`);
    this.name = DuplicateCustomMeasurementError.name;
  }
}

export class CustomMeasurementNotFoundError extends Error {
  constructor(name: string) {
    super(`Custom measurement "${name}" was not found.`);
    this.name = CustomMeasurementNotFoundError.name;
  }
}
