export class InvalidInventoryItemError extends Error {
  constructor(message = 'Invalid inventory item') {
    super(message);
    this.name = 'InvalidInventoryItemError';
  }
}

export class InvalidInventoryQuantityError extends Error {
  constructor() {
    super('Inventory quantity must be finite and cannot be negative');
    this.name = 'InvalidInventoryQuantityError';
  }
}

export class InvalidInventoryMovementError extends Error {
  constructor(message = 'Invalid inventory movement') {
    super(message);
    this.name = 'InvalidInventoryMovementError';
  }
}

export class InsufficientInventoryError extends Error {
  constructor() {
    super('Inventory quantity cannot become negative');
    this.name = 'InsufficientInventoryError';
  }
}

export class ArchivedInventoryItemError extends Error {
  constructor() {
    super('Archived inventory items do not accept movements');
    this.name = 'ArchivedInventoryItemError';
  }
}

export class DuplicateInventoryOperationError extends Error {
  constructor() {
    super('The inventory sync operation was already applied');
    this.name = 'DuplicateInventoryOperationError';
  }
}

export class InventoryMovementInvariantError extends Error {
  constructor() {
    super('Inventory movements are inconsistent with the current quantity');
    this.name = 'InventoryMovementInvariantError';
  }
}

export class InventoryVersionConflictError extends Error {
  constructor() {
    super('The inventory item was modified concurrently');
    this.name = 'InventoryVersionConflictError';
  }
}
