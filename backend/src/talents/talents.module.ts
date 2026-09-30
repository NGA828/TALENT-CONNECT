import { Module } from '@nestjs/common';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { RatingsModule } from '../ratings/ratings.module';
import { TalentsController } from './talents.controller';
import { TalentsService } from './talents.service';

@Module({ imports: [PortfoliosModule, RatingsModule], controllers: [TalentsController], providers: [TalentsService], exports: [TalentsService] })
export class TalentsModule {}
