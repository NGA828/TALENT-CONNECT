import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ChargeRequest, ChargeResult, PaymentProvider } from './payment.provider';

export const SANDBOX_TEST_CARDS = [
  { number: '4242 4242 4242 4242', brand: 'Visa', outcome: 'Succeeds' },
  { number: '5555 5555 5555 4444', brand: 'Mastercard', outcome: 'Succeeds' },
  { number: '4000 0000 0000 0002', brand: 'Visa', outcome: 'Declined' },
  { number: '4000 0000 0000 9995', brand: 'Visa', outcome: 'Insufficient funds' },
];

const OUTCOMES: Record<string, { brand: string; failure?: string }> = {
  '4242424242424242': { brand: 'Visa' },
  '5555555555554444': { brand: 'Mastercard' },
  '4000000000000002': { brand: 'Visa', failure: 'Your card was declined by the issuing bank.' },
  '4000000000009995': { brand: 'Visa', failure: 'Your card has insufficient funds.' },
};

/**
 * Development payment adapter. It behaves like a real gateway (latency, declines, references) but moves no money.
 * Only the published test cards are accepted – every other card is explicitly declined instead of silently "succeeding".
 */
@Injectable()
export class SandboxPaymentProvider extends PaymentProvider {
  readonly name = 'sandbox';
  readonly sandbox = true;

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    await new Promise((r) => setTimeout(r, 700));
    const providerRef = `sbx_ch_${randomBytes(8).toString('hex')}`;
    const last4 = req.card.number.slice(-4);
    const outcome = OUTCOMES[req.card.number];
    if (!outcome) {
      return { success: false, providerRef, last4, failureReason: 'Sandbox mode only accepts the published test cards.' };
    }
    if (outcome.failure) return { success: false, providerRef, last4, cardBrand: outcome.brand, failureReason: outcome.failure };
    return { success: true, providerRef, last4, cardBrand: outcome.brand };
  }

  async refund(providerRef: string) {
    await new Promise((r) => setTimeout(r, 300));
    return { success: true, providerRef: `sbx_re_${providerRef.slice(-12)}` };
  }
}
