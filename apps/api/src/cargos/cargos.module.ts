import { Module } from '@nestjs/common';
import { MapsModule } from '../maps/maps.module';
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';

@Module({
  imports: [MapsModule],
  controllers: [CargosController],
  providers: [CargosService],
})
export class CargosModule {}
