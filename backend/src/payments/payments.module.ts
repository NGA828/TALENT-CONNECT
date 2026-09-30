import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PromotersModule } from '../promoters/promoters.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProvider } from './providers/payment.provider';
import { SandboxPaymentProvider } from './providers/sandbox.provider';

@Module({
  imports: [PromotersModule],
  controllers: [PaymentsController],
  providers: [
    SandboxPaymentProvider,
    {
      // Select the gateway adapter from PAYMENT_PROVIDER. Register live adapters here.
      provide: PaymentProvider,
      inject: [ConfigService, SandboxPaymentProvider],
      useFactory: (config: ConfigService, sandbox: SandboxPaymentProvider) => {
        const name = config.get<string>('PAYMENT_PROVIDER') ?? 'sandbox';
        if (name !== 'sandbox') {
          throw new Error(`Unsupported PAYMENT_PROVIDER "${name}". Implement a PaymentProvider adapter for it or use "sandbox".`);
        }
        return sandbox;
      },
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
