const fs = require('fs');

function esCompatibleBackward(schemaViejo, schemaNuevo) {
  const problemas = [];
  const reqNuevo = new Set(schemaNuevo.required || []);
  const reqViejo = new Set(schemaViejo.required || []);

  // Regla 1: Nuevos campos requeridos sin valor por defecto rompen clientes existentes
  for (const campo of reqNuevo) {
    if (!reqViejo.has(campo) && !(campo in (schemaViejo.properties || {}))) {
      problemas.push(`Campo requerido nuevo sin default: ${campo}`);
    } else if (!reqViejo.has(campo) && (campo in (schemaViejo.properties || {}))) {
      // Un campo que era opcional en el viejo y ahora es requerido en el nuevo
      problemas.push(`Campo requerido nuevo sin default: ${campo}`);
    }
  }

  // Regla 2: Eliminar campos existentes rompe clientes que los envian (si additionalProperties: false)
  for (const campo of Object.keys(schemaViejo.properties || {})) {
    if (!(campo in (schemaNuevo.properties || {}))) {
      problemas.push(`Campo eliminado: ${campo}`);
    }
  }

  // Regla 3: Cambiar tipos de datos rompe la compatibilidad
  for (const campo of Object.keys(schemaViejo.properties || {})) {
    const tViejo = schemaViejo.properties[campo]?.type;
    const tNuevo = schemaNuevo.properties?.[campo]?.type;
    if (tNuevo && tViejo !== tNuevo) {
      problemas.push(`Tipo cambiado en ${campo}: ${tViejo} -> ${tNuevo}`);
    }
  }

  return { compatible: problemas.length === 0, problemas };
}

if (require.main === module) {
  if (process.argv.length < 4) {
    console.error('Uso: node check-compatibility.js <schemaViejo.json> <schemaNuevo.json>');
    process.exit(1);
  }
  const viejo = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
  const nuevo = JSON.parse(fs.readFileSync(process.argv[3], 'utf-8'));
  const resultado = esCompatibleBackward(viejo, nuevo);
  console.log(JSON.stringify(resultado, null, 2));
  if (!resultado.compatible) {
    process.exitCode = 1;
  }
}

module.exports = { esCompatibleBackward };
