import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import productoSchemaV1 from './productos/schemas/producto.schema.json';
import productoSchemaV2 from './productos/schemas/producto.schema.v2.json';
import productoSchemaV3 from './productos/schemas/producto.schema.v3-breaking.json';
import * as path from 'path';

function getCompatibilityChecker() {
  const scriptPath = path.join(process.cwd(), 'check-compatibility.js');
  return require(scriptPath).esCompatibleBackward;
}

@ApiTags('Sistema & Contratos')
@Controller('api')
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Healthcheck del servicio' })
  getHealth() {
    return {
      status: 'ok',
      service: 'nestjs-productos-api (Semana 7 - Contratos y JSON Schema)',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('schemas')
  @ApiOperation({ summary: 'Obtener los 3 contratos JSON Schema versionados' })
  getSchemas() {
    return {
      v1: productoSchemaV1,
      v2: productoSchemaV2,
      v3Breaking: productoSchemaV3,
    };
  }

  @Post('compatibility/check')
  @ApiOperation({ summary: 'Ejecutar comprobacion de compatibilidad backward entre esquemas' })
  checkCompatibility(@Body() body: { versionVieja: 'v1' | 'v2'; versionNueva: 'v2' | 'v3' }) {
    const schemas: Record<string, any> = {
      v1: productoSchemaV1,
      v2: productoSchemaV2,
      v3: productoSchemaV3,
    };
    const viejo = schemas[body.versionVieja] || productoSchemaV1;
    const nuevo = schemas[body.versionNueva] || productoSchemaV2;

    const checker = getCompatibilityChecker();
    const res = checker(viejo, nuevo);
    return {
      versionVieja: body.versionVieja,
      versionNueva: body.versionNueva,
      ...res,
    };
  }
}
