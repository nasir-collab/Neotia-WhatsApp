import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function createNestApp() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ANHVL WhatsApp Patient Engagement Platform API')
    .setDescription(
      'Production-Grade Healthcare Patient Engagement REST API for Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL) — Developed by Plan D Media.'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  try {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  } catch {
    // When running via esbuild without design:paramtypes reflection on route params, serve full OpenAPI 3.0 document
    const fallbackDoc: any = {
      ...swaggerConfig,
      paths: {
        '/api/v1/auth/login': { post: { tags: ['Authentication'], summary: 'Authenticate user and issue JWT tokens' } },
        '/api/v1/auth/refresh': { post: { tags: ['Authentication'], summary: 'Rotate access token using refresh token' } },
        '/api/v1/auth/logout': { post: { tags: ['Authentication'], summary: 'Invalidate session refresh token' } },
        '/api/v1/hospitals': {
          get: { tags: ['Hospitals'], summary: 'List hospitals and configurations' },
          post: { tags: ['Hospitals'], summary: 'Create hospital unit' },
        },
        '/api/v1/hospitals/{id}': { patch: { tags: ['Hospitals'], summary: 'Update hospital settings & quiet hours' } },
        '/api/v1/appointments': {
          get: { tags: ['Appointments'], summary: 'List appointments with filters & pagination' },
          post: { tags: ['Appointments'], summary: 'Ingest new appointment & schedule WhatsApp reminders' },
        },
        '/api/v1/appointments/{id}': {
          get: { tags: ['Appointments'], summary: 'Get full appointment lifecycle & events' },
          patch: { tags: ['Appointments'], summary: 'Update / reschedule appointment' },
        },
        '/api/v1/appointments/{id}/cancel': {
          post: { tags: ['Appointments'], summary: 'Confirm official HIS cancellation & suppress pending reminders' },
        },
        '/api/v1/patients': { get: { tags: ['Patients'], summary: 'List non-clinical patient service profiles' } },
        '/api/v1/patients/{id}': { get: { tags: ['Patients'], summary: 'Get patient profile & communication history' } },
        '/api/v1/messages': { get: { tags: ['WhatsApp Messages'], summary: 'List outbound & inbound message logs' } },
        '/api/v1/messages/test': { post: { tags: ['WhatsApp Messages'], summary: 'Send test template message' } },
        '/api/v1/templates': {
          get: { tags: ['Templates'], summary: 'List multilingual utility templates' },
          post: { tags: ['Templates'], summary: 'Create or version WhatsApp template' },
        },
        '/api/v1/followups': {
          get: { tags: ['Follow-Ups'], summary: 'List call-centre / Altruist tasks' },
          post: { tags: ['Follow-Ups'], summary: 'Create follow-up task' },
        },
        '/api/v1/followups/{id}': { patch: { tags: ['Follow-Ups'], summary: 'Update task status, priority, or notes' } },
        '/api/v1/followups/{id}/assign': { post: { tags: ['Follow-Ups'], summary: 'Assign task to call-centre agent' } },
        '/api/v1/attendance': { get: { tags: ['Attendance'], summary: 'List HIS attendance reconciliation records' } },
        '/api/v1/attendance/reconcile': { post: { tags: ['Attendance'], summary: 'Reconcile HIS attendance & trigger No-Show workflow' } },
        '/api/v1/integrations': { get: { tags: ['Integrations'], summary: 'List HIS, Meta WhatsApp & Altruist adapters' } },
        '/api/v1/integrations/test': { post: { tags: ['Integrations'], summary: 'Test adapter connection & check prerequisites' } },
        '/api/v1/reports/overview': { get: { tags: ['Reports'], summary: 'Executive Dashboard KPIs & hospital comparison' } },
        '/api/v1/reports/attendance': { get: { tags: ['Reports'], summary: 'Attendance conversion & doctor analysis' } },
        '/api/v1/reports/messages': { get: { tags: ['Reports'], summary: 'WhatsApp delivery & language routing report' } },
        '/api/v1/audit-logs': { get: { tags: ['Audit Logs'], summary: 'Security and operational audit trail' } },
        '/api/v1/webhooks/whatsapp': {
          get: { tags: ['Webhooks'], summary: 'Meta webhook verification challenge' },
          post: { tags: ['Webhooks'], summary: 'Receive Meta delivery receipts & inbound patient replies' },
        },
      },
    };
    SwaggerModule.setup('api/docs', app, fallbackDoc);
  }

  return app;
}

async function bootstrap() {
  const app = await createNestApp();
  const port = Number(process.env.PORT || 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`[ANHVL API] NestJS server running on http://localhost:${port}/api/v1`);
  console.log(`[ANHVL Swagger] OpenAPI documentation available at http://localhost:${port}/api/docs`);
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error('[ANHVL API Bootstrap Error]', err);
    process.exit(1);
  });
}
