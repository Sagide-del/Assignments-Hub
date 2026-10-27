import { Module } from '@nestjs/common';
import { KjseaController } from './kjsea.controller';
import { KjseaService } from './kjsea.service';
@Module({ controllers: [KjseaController], providers: [KjseaService] })
export class KjseaModule {}
