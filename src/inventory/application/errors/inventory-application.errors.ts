export class InventoryItemNotFoundError extends Error {
  constructor(message = 'Inventory item not found.') {
    super(message);
    this.name = InventoryItemNotFoundError.name;
  }
}

export class InvalidPreparationConsumptionError extends Error {
  constructor(message = 'The preparation consumption selection is invalid.') {
    super(message);
    this.name = InvalidPreparationConsumptionError.name;
  }
}
export class PreparedBatchNotFinalizedForInventoryError extends Error {
  constructor() {
    super('The prepared batch must be finalized.');
    this.name = PreparedBatchNotFinalizedForInventoryError.name;
  }
}
export class PreparedBatchInventoryAlreadyAppliedError extends Error {
  constructor() {
    super('Inventory consumption was already applied to this prepared batch.');
    this.name = PreparedBatchInventoryAlreadyAppliedError.name;
  }
}

export class InventoryAccessDeniedError extends Error {
  constructor() {
    super('The inventory household is not accessible to the user.');
    this.name = InventoryAccessDeniedError.name;
  }
}

export class InventoryAdminRequiredError extends Error {
  constructor() {
    super('Only household administrators can perform this inventory operation.');
    this.name = InventoryAdminRequiredError.name;
  }
}

export class InventoryFoodNotAvailableError extends Error {
  constructor() {
    super('Food is not available for this household.');
    this.name = InventoryFoodNotAvailableError.name;
  }
}

export class DuplicateInventorySourceError extends Error {
  constructor() {
    super('A compatible inventory item already exists for this food.');
    this.name = DuplicateInventorySourceError.name;
  }
}

export class UnsupportedInventoryUnitError extends Error {
  constructor() {
    super('Quantity unit is incompatible with the inventory item base unit.');
    this.name = UnsupportedInventoryUnitError.name;
  }
}

export class PreparedInventoryItemTypeError extends Error {
  constructor() {
    super('Only prepared food inventory items can create meals.');
    this.name = PreparedInventoryItemTypeError.name;
  }
}

export class PreparedFoodLeftoverNotFoundError extends Error {
  constructor() {
    super('The prepared food leftover was not found.');
    this.name = PreparedFoodLeftoverNotFoundError.name;
  }
}

export class PreparedInventoryProfileAccessError extends Error {
  constructor() {
    super('The adult profile is not active in the inventory household.');
    this.name = PreparedInventoryProfileAccessError.name;
  }
}
