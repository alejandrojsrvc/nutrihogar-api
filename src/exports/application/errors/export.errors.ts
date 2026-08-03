export class ExportAccessDeniedError extends Error {
  constructor() {
    super('You do not have permission to export this data.');
  }
}

export class InvalidExportQueryError extends Error {
  constructor(message: string) {
    super(message);
  }
}
