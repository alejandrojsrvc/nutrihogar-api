import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { IsString } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
