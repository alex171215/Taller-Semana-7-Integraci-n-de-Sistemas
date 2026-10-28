import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

@Injectable()
export class JsonSchemaValidationPipe implements PipeTransform {
  private validateFn: any;

  constructor(private schema: object) {
    this.validateFn = ajv.compile(this.schema);
  }

  transform(value: any, metadata?: ArgumentMetadata) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({
        mensaje: 'El cuerpo de la peticion no cumple el contrato JSON Schema',
        errores: [{ message: 'El payload debe ser un objeto JSON valido' }],
      });
    }

    const valido = this.validateFn(value);
    if (!valido) {
      throw new BadRequestException({
        mensaje: 'El cuerpo de la peticion no cumple el contrato JSON Schema',
        errores: this.validateFn.errors,
      });
    }
    return value;
  }
}
