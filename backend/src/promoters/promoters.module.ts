import { Module } from '@nestjs/common';
import { PromotersController } from './promoters.controller';
import { PromotersService } from './promoters.service';

@Module({ controllers: [PromotersController], providers: [PromotersService], exports: [PromotersService] })
export class PromotersModule {}
