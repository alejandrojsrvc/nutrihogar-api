export class PreparedBatchNotFoundError extends Error {
  constructor() {
    super('Prepared batch not found.');
    this.name = PreparedBatchNotFoundError.name;
  }
}

export class PreparedBatchAccessDeniedError extends Error {
  constructor() {
    super('The prepared batch is not accessible to the user.');
    this.name = PreparedBatchAccessDeniedError.name;
  }
}
