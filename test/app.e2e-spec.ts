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
    '/api/health': unknown;
    '/api/users/me': {
      get: {
        security: Array<Record<string, string[]>>;
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationTestController],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
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
  });

  it('GET /api/health returns the service status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    const body = JSON.parse(response.text) as HealthResponseBody;

    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('serves Swagger UI and the OpenAPI document', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    const body = JSON.parse(response.text) as OpenApiResponseBody;

    expect(body.info.title).toBe('NutriHogar API');
    expect(body.paths['/api/health']).toBeDefined();
    expect(body.paths['/api/users/me'].get.security).toEqual([{ bearer: [] }]);
  });

  it('rejects a request without a Supabase access token', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);

    expect(getCurrentUser.execute).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid Supabase access token', async () => {
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
