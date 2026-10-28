import { Injectable, NotFoundException } from '@nestjs/common';
import { Producto } from './dto/producto.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductosService {
  private productos: Map<string, Producto> = new Map();

  constructor() {
    // Semilla inicial
    this.crear({ nombre: 'Laptop UltraSlim', precio: 899.99, categoria: 'electronica' }, 'v2');
    this.crear({ nombre: 'Silla Ergonomica', precio: 199.50, categoria: 'oficina' }, 'v2');
    this.crear({ nombre: 'Lampara LED Smart', precio: 34.00, categoria: 'hogar' }, 'v2');
  }

  crear(datos: any, version: string = 'v1'): Producto {
    const id = 'prod-' + randomUUID().slice(0, 8);
    const nuevo: Producto = {
      id,
      nombre: datos.nombre,
      precio: Number(datos.precio),
      categoria: datos.categoria || undefined,
      versionEsquema: version,
      fechaCreacion: new Date().toISOString(),
    };
    this.productos.set(id, nuevo);
    return nuevo;
  }

  obtenerTodos(): Producto[] {
    return Array.from(this.productos.values());
  }

  obtenerPorId(id: string): Producto {
    const prod = this.productos.get(id);
    if (!prod) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return prod;
  }

  eliminar(id: string): boolean {
    if (!this.productos.has(id)) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return this.productos.delete(id);
  }

  resetear(): void {
    this.productos.clear();
    this.crear({ nombre: 'Laptop UltraSlim', precio: 899.99, categoria: 'electronica' }, 'v2');
    this.crear({ nombre: 'Silla Ergonomica', precio: 199.50, categoria: 'oficina' }, 'v2');
    this.crear({ nombre: 'Lampara LED Smart', precio: 34.00, categoria: 'hogar' }, 'v2');
  }
}
