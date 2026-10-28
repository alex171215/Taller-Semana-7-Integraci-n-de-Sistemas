import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearProductoV1Dto {
  @ApiProperty({ description: 'Nombre del producto', minLength: 1, maxLength: 120, example: 'Auriculares Bluetooth' })
  nombre: string;

  @ApiProperty({ description: 'Precio unitario en USD', minimum: 0, example: 49.99 })
  precio: number;
}

export class CrearProductoV2Dto {
  @ApiProperty({ description: 'Nombre del producto', minLength: 1, maxLength: 120, example: 'Teclado Mecanico' })
  nombre: string;

  @ApiProperty({ description: 'Precio unitario en USD', minimum: 0, example: 89.50 })
  precio: number;

  @ApiPropertyOptional({ description: 'Categoria del producto', enum: ['electronica', 'oficina', 'hogar'], example: 'electronica' })
  categoria?: 'electronica' | 'oficina' | 'hogar';
}

export class CrearProductoV3BreakingDto {
  @ApiProperty({ description: 'Nombre del producto', minLength: 1, maxLength: 120 })
  nombre: string;

  @ApiProperty({ description: 'Precio unitario en USD', minimum: 0 })
  precio: number;

  @ApiProperty({ description: 'Categoria requerida (Breaking change)', enum: ['electronica', 'oficina', 'hogar'] })
  categoria: 'electronica' | 'oficina' | 'hogar';
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria?: string;
  versionEsquema: string;
  fechaCreacion: string;
}
