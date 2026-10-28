import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Servir dashboard interactivo
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // Servir guia del taller original
  const workshopPath = path.join(process.cwd(), 'web-practica-Semana 7.html');
  app.use('/workshop', (req: express.Request, res: express.Response) => {
    if (fs.existsSync(workshopPath)) {
      res.sendFile(workshopPath);
    } else {
      res.status(404).send('Archivo de guia de taller no encontrado');
    }
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('API de Productos · Semana 7 (Contratos y JSON Schema)')
    .setDescription(
      'Demostracion de validacion Schema-first con ajv, versionamiento backward-compatible y deteccion de breaking changes.',
    )
    .setVersion('1.0.0')
    .addTag('Productos')
    .addTag('Sistema & Contratos')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n======================================================`);
  console.log(`🚀 SEMANA 7: CONTRATOS Y JSON SCHEMA CON AJV`);
  console.log(`🌐 Visualizador Web:       http://localhost:${port}`);
  console.log(`📚 Guia del Taller:        http://localhost:${port}/workshop`);
  console.log(`📖 Documentacion Swagger:  http://localhost:${port}/api/docs`);
  console.log(`📦 Endpoint Productos v1:  http://localhost:${port}/productos`);
  console.log(`📊 Healthcheck:            http://localhost:${port}/api/health`);
  console.log(`======================================================\n`);
}

bootstrap();
