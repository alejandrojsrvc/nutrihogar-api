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

  it('requires the Supabase Auth configuration outside tests', () => {
    const result = environmentValidationSchema.validate(
      {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      },
      { abortEarly: false },
    );

    expect(result.error?.message).toContain('SUPABASE_URL');
    expect(result.error?.message).toContain('SUPABASE_PUBLISHABLE_KEY');
  });
});
