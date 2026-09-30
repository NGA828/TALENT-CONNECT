import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { PublicController } from './public.controller';

@Module({ imports: [PaymentsModule], controllers: [PublicController] })
export class PublicModule {}
