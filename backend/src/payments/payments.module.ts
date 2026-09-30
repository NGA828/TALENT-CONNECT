import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromotersModule } from '../promoters/promoters.module';
import { LicenceFeeService } from './licence-fee.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ManualMobileMoneyProvider } from './providers/manual-mobile-money.provider';
import { MobileMoneyProvider } from './providers/mobile-money.provider';

@Module({
  imports: [PromotersModule],
  controllers: [PaymentsController],
  providers: [
    ManualMobileMoneyProvider,
    {
      /**
       * Selects the Mobile Money adapter from PAYMENT_PROVIDER. `manual` (the default) has promoters
       * pay with MTN MoMo or Orange Money and administrators confirm each transfer; register a live
       * Cameroonian aggregator (Campay, MeSomb, Notch Pay, MTN MoMo API, Orange Money API …) here to
       * settle transfers automatically.
       */
      provide: MobileMoneyProvider,
      inject: [ConfigService, ManualMobileMoneyProvider],
      useFactory: (config: ConfigService, manual: ManualMobileMoneyProvider) => {
        const name = config.get<string>('PAYMENT_PROVIDER') ?? 'manual';
        if (name === 'manual' || name === 'sandbox') return manual;
        throw new Error(`Unsupported PAYMENT_PROVIDER "${name}". Implement a MobileMoneyProvider adapter for it or use "manual".`);
      },
    },
    LicenceFeeService,
    PaymentsService,
  ],
  exports: [PaymentsService, LicenceFeeService],
})
export class PaymentsModule {}
