import { Module } from '@nestjs/common';
import { ProductosModule } from './productos/productos.module';
import { AppController } from './app.controller';

@Module({
  imports: [ProductosModule],
  controllers: [AppController],
})
export class AppModule {}
