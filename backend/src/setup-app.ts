import { INestApplication, UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import path from 'path';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

function flatten(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const key = prefix ? `${prefix}.${e.property}` : e.property;
    if (e.constraints) out[key] = Object.values(e.constraints);
    if (e.children?.length) Object.assign(out, flatten(e.children, key));
  }
  return out;
}

/** Shared bootstrap configuration (used by main.ts and the e2e tests). */
export function configureApp(app: INestApplication, corsOrigins: string[] = []) {
  app.setGlobalPrefix('api');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Locally stored uploads (development storage provider). Files are served inert: no sniffing, no scripts.
  (app as NestExpressApplication).useStaticAssets(path.resolve(process.env.UPLOAD_DIR ?? './uploads'), {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });
  app.enableCors({ origin: corsOrigins.length ? corsOrigins : false, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors) => {
        const fields = flatten(errors);
        return new UnprocessableEntityException({ message: 'Validation failed. Please check the highlighted fields.', errors: fields });
      },
    }),
  );
}
