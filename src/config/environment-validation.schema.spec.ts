import { environmentValidationSchema } from './environment-validation.schema';

describe('environmentValidationSchema', () => {
  it('requires DATABASE_URL outside the test environment', () => {
    const result = environmentValidationSchema.validate({
      NODE_ENV: 'development',
    });

    expect(result.error?.message).toContain('DATABASE_URL');
  });

  it('allows the application tests to run without a database', () => {
    const result = environmentValidationSchema.validate({ NODE_ENV: 'test' });

    expect(result.error).toBeUndefined();
  });

  it('requires JWT secrets outside tests', () => {
    const result = environmentValidationSchema.validate(
      {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      },
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('JWT_ACCESS_SECRET');
    expect(result.error?.message).toContain('JWT_REFRESH_SECRET');
  });

  it('requires R2 credentials only when the R2 driver is selected', () => {
    const result = environmentValidationSchema.validate(
      {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nutrihogar',
        JWT_ACCESS_SECRET: 'access-secret-that-is-long-enough-for-tests',
        JWT_REFRESH_SECRET: 'refresh-secret-that-is-long-enough-for-tests',
        STORAGE_DRIVER: 'r2',
      },
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('R2_ACCOUNT_ID');
    expect(result.error?.message).toContain('R2_ACCESS_KEY_ID');
    expect(result.error?.message).toContain('R2_SECRET_ACCESS_KEY');
    expect(result.error?.message).toContain('R2_BUCKET');
  });

  it('does not require R2 credentials for the local MinIO driver', () => {
    const result = environmentValidationSchema.validate({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nutrihogar',
      JWT_ACCESS_SECRET: 'access-secret-that-is-long-enough-for-tests',
      JWT_REFRESH_SECRET: 'refresh-secret-that-is-long-enough-for-tests',
      STORAGE_DRIVER: 'minio',
      MINIO_ACCESS_KEY_ID: 'minioadmin',
      MINIO_SECRET_ACCESS_KEY: 'minioadmin',
      MINIO_BUCKET: 'nutrihogar',
    });

    expect(result.error).toBeUndefined();
  });
});
