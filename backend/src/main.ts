import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const origins = (config.get<string>('CORS_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  configureApp(app, origins);
  app.enableShutdownHooks();
  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Talent Connect API listening on http://0.0.0.0:${port}/api`);
}
bootstrap();
