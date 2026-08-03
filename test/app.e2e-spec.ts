import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { InvalidIdentityError } from '../src/identity/application/errors/invalid-identity.error';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { LOGIN_USE_CASE } from '../src/identity/application/use-cases/login.use-case';
import { LOGOUT_USE_CASE } from '../src/identity/application/use-cases/logout.use-case';
import { REFRESH_USE_CASE } from '../src/identity/application/use-cases/refresh.use-case';
import { REGISTER_USE_CASE } from '../src/identity/application/use-cases/register.use-case';

class ValidationRequestDto {
  @IsString()
  name!: string;
}

interface HealthResponseBody {
  status: string;
  timestamp: string;
}

interface OpenApiResponseBody {
  info: {
    title: string;
  };
  paths: {
    '/api/auth/register': unknown;
    '/api/auth/login': unknown;
    '/api/auth/refresh': unknown;
    '/api/auth/logout': unknown;
    '/api/health': unknown;
    '/api/households': unknown;
    '/api/households/{householdId}/invitations': unknown;
    '/api/household-invitations/{token}/accept': unknown;
    '/api/household-invitations/{invitationId}/cancel': unknown;
    '/api/users/me': {
      get: {
        security: Array<Record<string, string[]>>;
      };
    };
    '/api/prepared-batches/{batchId}/inventory-consumption-preview': unknown;
    '/api/prepared-leftovers/{leftoverId}/add-to-inventory': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: string;
              };
            };
          };
        };
      };
    };
    '/api/households/{householdId}/inventory/sync': unknown;
  };
  components: {
    schemas: {
      PreparedBatchInventoryPreviewResponseDto: {
        properties: Record<string, unknown>;
      };
      InventorySyncOperationRequestDto: {
        properties: {
          movementType: {
            enum: string[];
          };
        };
      };
    };
  };
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string[];
  path: string;
  timestamp: string;
}

@Controller('validation-test')
class ValidationTestController {
  @Post()
  validate(@Body() body: ValidationRequestDto): ValidationRequestDto {
    return body;
  }
}

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = {
    execute: jest.fn(),
  };
  const register = { execute: jest.fn() };
  const login = { execute: jest.fn() };
  const refresh = { execute: jest.fn() };
  const logout = { execute: jest.fn() };
  const authResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'local-user-id',
      email: 'usuario@example.com',
      displayName: 'Alejandro',
      avatarUrl: null,
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationTestController],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(REGISTER_USE_CASE)
      .useValue(register)
      .overrideProvider(LOGIN_USE_CASE)
      .useValue(login)
      .overrideProvider(REFRESH_USE_CASE)
      .useValue(refresh)
      .overrideProvider(LOGOUT_USE_CASE)
      .useValue(logout)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getCurrentUser.execute.mockReset();
    register.execute.mockReset();
    login.execute.mockReset();
    refresh.execute.mockReset();
    logout.execute.mockReset();
  });

  it('GET /api/health returns the service status', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    const body = JSON.parse(response.text) as HealthResponseBody;

    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('serves Swagger UI and the OpenAPI document', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);

    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const body = JSON.parse(response.text) as OpenApiResponseBody;

    expect(body.info.title).toBe('NutriHogar API');
    expect(body.paths['/api/health']).toBeDefined();
    expect(body.paths['/api/auth/register']).toBeDefined();
    expect(body.paths['/api/auth/login']).toBeDefined();
    expect(body.paths['/api/auth/refresh']).toBeDefined();
    expect(body.paths['/api/auth/logout']).toBeDefined();
    expect(body.paths['/api/households']).toBeDefined();
    expect(body.paths['/api/households/{householdId}/invitations']).toBeDefined();
    expect(body.paths['/api/household-invitations/{token}/accept']).toBeDefined();
    expect(body.paths['/api/household-invitations/{invitationId}/cancel']).toBeDefined();
    expect(body.paths['/api/households/{householdId}/adult-profiles']).toBeDefined();
    expect(body.paths['/api/adult-profiles/{profileId}']).toBeDefined();
    expect(body.paths['/api/foods']).toBeDefined();
    expect(body.paths['/api/foods/{foodId}']).toBeDefined();
    expect(body.paths['/api/food-categories']).toBeDefined();
    expect(body.paths['/api/nutrients']).toBeDefined();
    expect(body.paths['/api/users/me'].get.security).toEqual([{ bearer: [] }]);
    expect(
      body.paths['/api/prepared-batches/{batchId}/inventory-consumption-preview'],
    ).toBeDefined();
    expect(
      body.paths['/api/prepared-leftovers/{leftoverId}/add-to-inventory'].post.requestBody.content[
        'application/json'
      ].schema.$ref,
    ).toContain('AddPreparedLeftoverToInventoryRequestDto');
    expect(body.paths['/api/households/{householdId}/inventory/sync']).toBeDefined();
    expect(
      body.components.schemas.PreparedBatchInventoryPreviewResponseDto.properties.ingredients,
    ).toBeDefined();
    expect(
      body.components.schemas.InventorySyncOperationRequestDto.properties.movementType.enum,
    ).toContain('EXPIRATION');
  });

  it('rejects a request without a JWT access token', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);

    expect(getCurrentUser.execute).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid JWT access token', async () => {
    getCurrentUser.execute.mockRejectedValue(new InvalidIdentityError());

    await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('returns the authenticated local user', async () => {
    getCurrentUser.execute.mockResolvedValue({
      id: 'local-user-id',
      email: 'usuario@example.com',
      displayName: 'Alejandro',
      avatarUrl: null,
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
    });

    await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect({
        id: 'local-user-id',
        email: 'usuario@example.com',
        displayName: 'Alejandro',
        avatarUrl: null,
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR',
      });
  });

  it('supports the register, login, refresh and logout HTTP contracts', async () => {
    register.execute.mockResolvedValue(authResponse);
    login.execute.mockResolvedValue(authResponse);
    refresh.execute.mockResolvedValue(authResponse);
    logout.execute.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'usuario@example.com', password: 'password-seguro', displayName: 'Alejandro' })
      .expect(201)
      .expect(authResponse);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'usuario@example.com', password: 'password-seguro' })
      .expect(200)
      .expect(authResponse);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'refresh-token' })
      .expect(200)
      .expect(authResponse);
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: 'refresh-token' })
      .expect(204);
    expect(logout.execute).toHaveBeenCalledWith('refresh-token');
  });

  it('rejects invalid registration email and password DTOs', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(register.execute).not.toHaveBeenCalled();
  });

  it('returns a consistent error for an invalid DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/validation-test')
      .send({ unknown: true })
      .expect(400);
    const body = JSON.parse(response.text) as ErrorResponseBody;

    expect(body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      path: '/api/validation-test',
    });
    expect(Array.isArray(body.message)).toBe(true);
    expect(typeof body.timestamp).toBe('string');
  });
});
