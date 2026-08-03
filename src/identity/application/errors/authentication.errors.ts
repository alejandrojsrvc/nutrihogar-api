export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = InvalidCredentialsError.name;
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = EmailAlreadyRegisteredError.name;
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('Invalid or expired refresh token.');
    this.name = InvalidRefreshTokenError.name;
  }
}
