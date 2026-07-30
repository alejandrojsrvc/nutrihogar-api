import {
  InvalidAdultProfileBirthDateError,
  InvalidAdultProfileHeightError,
} from '../adult-profile-errors/adult-profile.errors';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseBirthDate(value: string, today = new Date()): Date {
  if (!dateOnlyPattern.test(value)) {
    throw new InvalidAdultProfileBirthDateError();
  }

  const birthDate = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.toISOString().slice(0, 10) !== value ||
    value > today.toISOString().slice(0, 10)
  ) {
    throw new InvalidAdultProfileBirthDateError();
  }

  return birthDate;
}

export function ensureValidHeight(heightCm: number): void {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new InvalidAdultProfileHeightError();
  }
}

export function calculateAge(birthDate: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - birthDate.getUTCMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}
