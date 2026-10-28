const { esCompatibleBackward } = require('../check-compatibility');
const schemaV1 = require('../src/productos/schemas/producto.schema.json');
const schemaV2 = require('../src/productos/schemas/producto.schema.v2.json');
const schemaV3Breaking = require('../src/productos/schemas/producto.schema.v3-breaking.json');

describe('Paso 6: Algoritmo de Verificacion de Backward Compatibility', () => {
  it('Paso 6 Verificacion: v1 -> v2 debe ser COMPATIBLE (campo opcional nuevo)', () => {
    const res = esCompatibleBackward(schemaV1, schemaV2);
    expect(res.compatible).toBe(true);
    expect(res.problemas).toHaveLength(0);
  });

  it('Paso 6 Verificacion: v2 -> v3-breaking debe ser INCOMPATIBLE (campo nuevo requerido)', () => {
    const res = esCompatibleBackward(schemaV2, schemaV3Breaking);
    expect(res.compatible).toBe(false);
    expect(res.problemas).toContain('Campo requerido nuevo sin default: categoria');
  });

  it('debe detectar incompatibilidad si se elimina un campo existente', () => {
    const schemaEliminado = {
      type: 'object',
      required: ['nombre'],
      properties: {
        nombre: { type: 'string' }
        // precio eliminado
      }
    };
    const res = esCompatibleBackward(schemaV1, schemaEliminado);
    expect(res.compatible).toBe(false);
    expect(res.problemas).toContain('Campo eliminado: precio');
  });

  it('debe detectar incompatibilidad si se cambia el tipo de dato de una propiedad', () => {
    const schemaTipoCambiado = {
      type: 'object',
      required: ['nombre', 'precio'],
      properties: {
        nombre: { type: 'string' },
        precio: { type: 'string' } // number -> string
      }
    };
    const res = esCompatibleBackward(schemaV1, schemaTipoCambiado);
    expect(res.compatible).toBe(false);
    expect(res.problemas).toContain('Tipo cambiado en precio: number -> string');
  });
});
