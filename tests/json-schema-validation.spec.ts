import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JsonSchemaValidationPipe } from '../src/common/json-schema-validation.pipe';
import { ProductosController } from '../src/productos/productos.controller';
import { ProductosService } from '../src/productos/productos.service';
import productoSchemaV1 from '../src/productos/schemas/producto.schema.json';
import productoSchemaV2 from '../src/productos/schemas/producto.schema.v2.json';
import productoSchemaV3 from '../src/productos/schemas/producto.schema.v3-breaking.json';

describe('Paso 3, 4 y 5: Validacion con JSON Schema y ajv', () => {
  let pipeV1: JsonSchemaValidationPipe;
  let pipeV2: JsonSchemaValidationPipe;
  let pipeV3: JsonSchemaValidationPipe;
  let controller: ProductosController;
  let service: ProductosService;

  beforeEach(async () => {
    pipeV1 = new JsonSchemaValidationPipe(productoSchemaV1);
    pipeV2 = new JsonSchemaValidationPipe(productoSchemaV2);
    pipeV3 = new JsonSchemaValidationPipe(productoSchemaV3);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductosController],
      providers: [ProductosService],
    }).compile();

    controller = module.get<ProductosController>(ProductosController);
    service = module.get<ProductosService>(ProductosService);
  });

  describe('Paso 3 y 4: Esquema v1', () => {
    it('debe aceptar un producto valido con nombre y precio', () => {
      const payload = { nombre: 'Auriculares Inalambricos', precio: 45.99 };
      const resultado = pipeV1.transform(payload);
      expect(resultado).toEqual(payload);
    });

    it('Paso 4: debe rechazar con 400 cuando falta el campo requerido precio', () => {
      const payload = { nombre: 'Auriculares' };
      try {
        pipeV1.transform(payload);
        fail('Debio lanzar BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp: any = err.getResponse();
        expect(resp.mensaje).toContain('no cumple el contrato JSON Schema');
        expect(resp.errores).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              keyword: 'required',
              params: { missingProperty: 'precio' },
            }),
          ]),
        );
      }
    });

    it('Paso 4: debe rechazar con 400 cuando se envia un campo no declarado (stock) debido a additionalProperties: false', () => {
      const payload = { nombre: 'Auriculares', precio: 10, stock: 5 };
      try {
        pipeV1.transform(payload);
        fail('Debio lanzar BadRequestException');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp: any = err.getResponse();
        expect(resp.errores).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              keyword: 'additionalProperties',
              params: { additionalProperty: 'stock' },
            }),
          ]),
        );
      }
    });

    it('debe rechazar con 400 si precio es negativo', () => {
      const payload = { nombre: 'Mouse', precio: -15 };
      expect(() => pipeV1.transform(payload)).toThrow(BadRequestException);
    });

    it('debe rechazar con 400 si nombre esta vacio (minLength: 1)', () => {
      const payload = { nombre: '', precio: 10 };
      expect(() => pipeV1.transform(payload)).toThrow(BadRequestException);
    });
  });

  describe('Paso 5: Versionamiento Compatible (Esquema v2)', () => {
    it('Verificacion Paso 5.1: debe aceptar una peticion en formato v1 SIN categoria (backward compatible)', () => {
      const payloadV1 = { nombre: 'Teclado Gamer', precio: 80 };
      const resultado = pipeV2.transform(payloadV1);
      expect(resultado).toEqual(payloadV1);
    });

    it('Verificacion Paso 5.2: debe aceptar una peticion en formato v2 CON categoria permitida', () => {
      const payloadV2 = { nombre: 'Teclado Gamer', precio: 80, categoria: 'electronica' };
      const resultado = pipeV2.transform(payloadV2);
      expect(resultado).toEqual(payloadV2);
    });

    it('debe rechazar con 400 si categoria no pertenece al enum', () => {
      const payloadInvalido = { nombre: 'Mesa', precio: 50, categoria: 'muebles' };
      expect(() => pipeV2.transform(payloadInvalido)).toThrow(BadRequestException);
    });
  });

  describe('Paso 6: Breaking Change (Esquema v3-breaking)', () => {
    it('debe rechazar una peticion valida en v1 y v2 si no incluye la categoria requerida', () => {
      const payloadViejo = { nombre: 'Mouse Pad', precio: 12 };
      try {
        pipeV3.transform(payloadViejo);
        fail('Debio fallar porque categoria ahora es requerida');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const resp: any = err.getResponse();
        expect(resp.errores).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              keyword: 'required',
              params: { missingProperty: 'categoria' },
            }),
          ]),
        );
      }
    });

    it('debe aceptar peticion v3 si incluye la categoria obligatoria', () => {
      const payloadV3 = { nombre: 'Mouse Pad', precio: 12, categoria: 'oficina' };
      expect(pipeV3.transform(payloadV3)).toEqual(payloadV3);
    });
  });

  describe('Controlador de Productos E2E en memoria', () => {
    it('debe crear y listar productos', () => {
      const nuevo = controller.crear({ nombre: 'Monitor 27', precio: 299.99 });
      expect(nuevo.id).toMatch(/^prod-[a-f0-9]{8}$/);
      expect(nuevo.versionEsquema).toBe('v1');

      const todos = controller.obtenerTodos();
      expect(todos.some((p) => p.id === nuevo.id)).toBe(true);
    });
  });
});
