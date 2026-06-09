// WHY: Force Node.js process running NestJS to accept self-signed SSL certificates when connecting to Supabase.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // This ensures all incoming requests are automatically validated
  // against the rules defined in our DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // WHY: Mount interactive API docs at /docs. The controllers are already annotated with
  // @ApiTags/@ApiOperation/@ApiBearerAuth, so this exposes a Swagger UI where an admin can try
  // every endpoint (incl. POST /seasons/awards and POST /matches/legacy) with a bearer token.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Terças FC API')
    .setDescription('League management API for Liga de Craques.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  // WHY: Binds to dynamic PORT environment variable assigned by platforms like Render, falling back to 3000 for local development.
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
