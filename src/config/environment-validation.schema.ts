import Joi from 'joi';

const optionalString = Joi.string().allow('').optional();
const storageCredential = (driver: 'minio' | 'r2', name: string, developmentDefault?: string) => {
  const required = Joi.required().messages({
    'any.required': `${name} es obligatorio cuando STORAGE_DRIVER=${driver}.`,
  });
  const selected = developmentDefault
    ? Joi.when('NODE_ENV', {
        is: 'test',
        then: Joi.optional().allow(''),
        otherwise: Joi.when('NODE_ENV', {
          is: 'production',
          then: required,
          otherwise: Joi.string().default(developmentDefault),
        }),
      })
    : Joi.when('NODE_ENV', {
        is: 'test',
        then: Joi.optional().allow(''),
        otherwise: required,
      });

  return Joi.string().when('STORAGE_DRIVER', {
    is: driver,
    then: selected,
    otherwise: optionalString,
  });
};
const databaseUrl = Joi.string()
  .uri({ scheme: ['postgres', 'postgresql'] })
  .when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().allow(''),
    otherwise: Joi.required().messages({
      'any.required': 'DATABASE_URL es obligatoria fuera del entorno de pruebas.',
    }),
  });
const jwtSecret = (name: string) =>
  Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'test',
      then: Joi.string().min(32).default(`test-${name.toLowerCase()}-secret-0123456789`),
      otherwise: Joi.required().messages({
        'any.required': `${name} es obligatorio fuera del entorno de pruebas.`,
      }),
    });

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: databaseUrl,
  DIRECT_URL: optionalString,
  JWT_ACCESS_SECRET: jwtSecret('JWT_ACCESS_SECRET'),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: jwtSecret('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  STORAGE_DRIVER: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().valid('memory', 'minio', 'r2').default('memory'),
    otherwise: Joi.string().valid('minio', 'r2').default('minio'),
  }),
  MINIO_ENDPOINT: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://127.0.0.1:9000'),
  MINIO_ACCESS_KEY_ID: storageCredential('minio', 'MINIO_ACCESS_KEY_ID', 'minioadmin'),
  MINIO_SECRET_ACCESS_KEY: storageCredential('minio', 'MINIO_SECRET_ACCESS_KEY', 'minioadmin'),
  MINIO_BUCKET: storageCredential('minio', 'MINIO_BUCKET', 'nutrihogar'),
  R2_ACCOUNT_ID: storageCredential('r2', 'R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: storageCredential('r2', 'R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: storageCredential('r2', 'R2_SECRET_ACCESS_KEY'),
  R2_BUCKET: storageCredential('r2', 'R2_BUCKET'),
  UPLOAD_MAX_FILE_SIZE_MB: Joi.number().integer().min(1).max(100).default(10),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  GEMINI_API_KEY: optionalString,
  GEMINI_BASE_URL: Joi.string().uri().default('https://generativelanguage.googleapis.com'),
  GEMINI_MODEL: Joi.string().default('gemini-3.5-flash-lite'),
  GEMINI_TIMEOUT_MS: Joi.number().integer().min(1000).default(120000),
  NUTRITION_LABEL_MAX_FILE_SIZE_MB: Joi.number().integer().min(1).max(100).default(10),
}).unknown(true);
