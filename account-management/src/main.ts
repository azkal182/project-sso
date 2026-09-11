import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { migrate, pool } from './db/database';
import { ValidationPipe } from '@nestjs/common';
import { ensureCsrfToken, verifyCsrfToken } from './auth/csrf.middleware';
import { validateConfiguration } from './security/configuration';
import { createRateLimitMiddleware } from './security/rate-limit.middleware';
import { requestObservability } from './observability/request.middleware';

async function bootstrap() {
  validateConfiguration();
  await migrate();
  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV === 'production') app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(requestObservability);
  const frontendOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: frontendOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json());
  app.use('/auth/login', createRateLimitMiddleware({ name: 'auth-login', windowMs: 60_000, max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 20) }));
  app.use('/auth/callback', createRateLimitMiddleware({ name: 'auth-callback', windowMs: 60_000, max: Number(process.env.RATE_LIMIT_CALLBACK_MAX || 20) }));
  app.use('/api', createRateLimitMiddleware({ name: 'api', windowMs: 60_000, max: Number(process.env.RATE_LIMIT_API_MAX || 240) }));
  const SessionStore = pgSession(session);
  app.use(session({ store: new SessionStore({ pool, createTableIfMissing: true }), secret: process.env.SESSION_SECRET!, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 } }));
  app.use(ensureCsrfToken);
  app.use(verifyCsrfToken);
  await app.listen(Number(process.env.PORT || 3000));
  console.log(`NestJS Account Management listening on :${process.env.PORT || 3000}`);
}
bootstrap().catch((error) => { console.error(error); process.exit(1); });
