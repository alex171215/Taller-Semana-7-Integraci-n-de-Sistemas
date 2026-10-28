import { Controller, Post, Get, Body, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProductosService } from './productos.service';
import { JsonSchemaValidationPipe } from '../common/json-schema-validation.pipe';
import { CrearProductoV1Dto, CrearProductoV2Dto, CrearProductoV3BreakingDto } from './dto/producto.dto';

// Esquemas JSON independientes (Schema-first)
import productoSchemaV1 from './schemas/producto.schema.json';
import productoSchemaV2 from './schemas/producto.schema.v2.json';
import productoSchemaV3 from './schemas/producto.schema.v3-breaking.json';

@ApiTags('Productos')
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear producto con validacion JSON Schema v1 (Paso 3 y 4)',
    description: 'Valida estrictamente con producto.schema.json (requiere nombre y precio, additionalProperties: false)',
  })
  @ApiBody({ type: CrearProductoV1Dto })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error de validacion contra el contrato JSON Schema de ajv' })
  crear(@Body(new JsonSchemaValidationPipe(productoSchemaV1)) body: CrearProductoV1Dto) {
    return this.productosService.crear(body, 'v1');
  }

  @Post('v2')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear producto con validacion JSON Schema v2 compatible (Paso 5)',
    description: 'Acepta categoria opcional (electronica, oficina, hogar). Es backward-compatible con peticiones v1.',
  })
  @ApiBody({ type: CrearProductoV2Dto })
  @ApiResponse({ status: 201, description: 'Producto creado con esquema v2' })
  @ApiResponse({ status: 400, description: 'Error de validacion ajv' })
  crearV2(@Body(new JsonSchemaValidationPipe(productoSchemaV2)) body: CrearProductoV2Dto) {
    return this.productosService.crear(body, 'v2');
  }

  @Post('v3-breaking')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Endpoint de prueba con JSON Schema v3-breaking (Paso 6)',
    description: 'Exige obligatoriamente categoria. Si se envia una peticion v1 (sin categoria) sera rechazada con 400.',
  })
  @ApiBody({ type: CrearProductoV3BreakingDto })
  @ApiResponse({ status: 201, description: 'Producto creado con esquema v3' })
  @ApiResponse({ status: 400, description: 'Rechazo: Falta categoria requerida' })
  crearV3Breaking(@Body(new JsonSchemaValidationPipe(productoSchemaV3)) body: CrearProductoV3BreakingDto) {
    return this.productosService.crear(body, 'v3-breaking');
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos registrados' })
  obtenerTodos() {
    return this.productosService.obtenerTodos();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  obtenerPorId(@Param('id') id: string) {
    return this.productosService.obtenerPorId(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un producto' })
  eliminar(@Param('id') id: string) {
    return { ok: this.productosService.eliminar(id) };
  }
}
