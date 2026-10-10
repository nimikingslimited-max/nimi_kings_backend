import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for versioned REST API
  app.setGlobalPrefix('api/v1');

  // Enable CORS for frontend applications (Next.js, mobile clients, admin portal)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe for strict DTO checking
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI / Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('NIMI KINGS LTD - Enterprise Backend API')
    .setDescription(
      'Unified REST API contracts for Real Estate, Property Verification, Construction Operations, Agriculture Asset Management, and RBAC authentication.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 NIMI KINGS Backend running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger Documentation available at: http://localhost:${port}/api/docs`);
}

await bootstrap();
