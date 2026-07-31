export class PreparedBatchIngredientsRequiredError extends Error {
  constructor() {
    super('A prepared batch must contain at least one ingredient.');
    this.name = PreparedBatchIngredientsRequiredError.name;
  }
}

export class InvalidPreparedBatchIngredientError extends Error {
  constructor() {
    super('The prepared batch ingredient is invalid.');
    this.name = InvalidPreparedBatchIngredientError.name;
  }
}

export class PreparedBatchNotDraftError extends Error {
  constructor() {
    super('Only draft prepared batches can be edited or confirmed.');
    this.name = PreparedBatchNotDraftError.name;
  }
}

export class PreparedBatchNotConfirmableError extends Error {
  constructor() {
    super('Only prepared batches with confirmed ingredients can be finalized.');
    this.name = PreparedBatchNotConfirmableError.name;
  }
}

export class PreparedBatchAlreadyFinalizedError extends Error {
  constructor() {
    super('The prepared batch has already been finalized.');
    this.name = PreparedBatchAlreadyFinalizedError.name;
  }
}

export class PreparedBatchCancelledError extends Error {
  constructor() {
    super('The prepared batch has been cancelled.');
    this.name = PreparedBatchCancelledError.name;
  }
}

export class PreparedBatchNotFinalizedError extends Error {
  constructor() {
    super('Only finalized prepared batches can receive served portions.');
    this.name = PreparedBatchNotFinalizedError.name;
  }
}

export class PreparedBatchSnapshotMismatchError extends Error {
  constructor() {
    super('The nutrition snapshots do not match the prepared batch ingredients.');
    this.name = PreparedBatchSnapshotMismatchError.name;
  }
}

export class InvalidPreparedBatchCookedWeightError extends Error {
  constructor() {
    super('The final cooked weight must be greater than zero.');
    this.name = InvalidPreparedBatchCookedWeightError.name;
  }
}
