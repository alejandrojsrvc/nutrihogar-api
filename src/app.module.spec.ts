import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { configureApplication } from './configure-application';

describe('AppModule', () => {
  it('starts the application', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleFixture.createNestApplication();

    configureApplication(app, app.get(ConfigService));

    await expect(app.init()).resolves.toBeDefined();
    await app.close();
  });
});
