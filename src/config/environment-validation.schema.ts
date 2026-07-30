import Joi from 'joi';

const optionalString = Joi.string().allow('').optional();
const databaseUrl = Joi.string()
  .uri({ scheme: ['postgres', 'postgresql'] })
  .when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().allow(''),
    otherwise: Joi.required().messages({
      'any.required':
        'DATABASE_URL es obligatoria fuera del entorno de pruebas.',
    }),
  });

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: databaseUrl,
  DIRECT_URL: optionalString,
  SUPABASE_URL: optionalString,
  SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_JWT_SECRET: optionalString,
  SUPABASE_STORAGE_BUCKET: Joi.string().default('user-files'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
}).unknown(true);
