import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fs from 'fs';
import path from 'path';

async function generateOpenApiJson() {
  const { AppModule } = await import('../dist/app.module.js');
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix('api/v1');

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

  const docsDir = path.resolve('docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outputPath = path.join(docsDir, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log(`✅ OpenAPI specification exported successfully to ${outputPath}`);
  console.log(`Total endpoints documented: ${Object.keys(document.paths).length}`);

  await app.close();
}

generateOpenApiJson().catch((err) => {
  console.error('❌ Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
