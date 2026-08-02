import Joi from 'joi';

const optionalString = Joi.string().allow('').optional();
const databaseUrl = Joi.string()
  .uri({ scheme: ['postgres', 'postgresql'] })
  .when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().allow(''),
    otherwise: Joi.required().messages({
      'any.required': 'DATABASE_URL es obligatoria fuera del entorno de pruebas.',
    }),
  });
const supabaseUrl = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .when('NODE_ENV', {
    is: 'test',
    then: Joi.optional().allow(''),
    otherwise: Joi.required().messages({
      'any.required': 'SUPABASE_URL es obligatoria para validar Auth.',
    }),
  });
const supabasePublishableKey = Joi.string().when('NODE_ENV', {
  is: 'test',
  then: Joi.optional().allow(''),
  otherwise: Joi.required().messages({
    'any.required': 'SUPABASE_PUBLISHABLE_KEY es obligatoria para validar Auth.',
  }),
});

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: databaseUrl,
  DIRECT_URL: optionalString,
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  SUPABASE_SECRET_KEY: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_JWT_SECRET: optionalString,
  SUPABASE_STORAGE_BUCKET: Joi.string().default('user-files'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  AI_PROVIDER: Joi.string().default('disabled'),
  AI_PROVIDER_API_KEY: optionalString,
  AI_PROVIDER_ENDPOINT: optionalString,
  AI_MODEL_WEEKLY_PLAN: Joi.string().default('weekly-plan-default'),
  AI_MODEL_RECIPE: Joi.string().default('recipe-default'),
  AI_REQUEST_TIMEOUT_MS: Joi.number().integer().min(100).default(10000),
  AI_MAX_RETRIES: Joi.number().integer().min(0).max(5).default(1),
  AI_FEATURE_ENABLED: Joi.boolean().default(false),
  AI_MAX_REQUESTS_PER_HOUSEHOLD: Joi.number().integer().min(1).default(10),
}).unknown(true);
