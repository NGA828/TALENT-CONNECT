import { PaymentMethod } from '@prisma/client';

export interface CollectRequest {
  amount: number;
  currency: string;
  /** Platform reference (Payment.id) sent to the gateway. */
  reference: string;
  description: string;
  method: PaymentMethod;
  payerName: string;
  /** Canonical Cameroonian Mobile Money number, +2376XXXXXXXXX. */
  payerPhone: string;
  /** Transaction ID the promoter read from the MTN MoMo / Orange Money SMS receipt. */
  transactionRef: string;
}

export interface CollectResult {
  /**
   * PENDING when the transfer still has to be confirmed by an administrator, SUCCESS / FAILED when
   * a gateway settled it automatically.
   */
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  providerRef: string;
  failureReason?: string;
}

export interface RefundResult {
  success: boolean;
  providerRef: string;
  failureReason?: string;
}

/**
 * Abstraction over the Cameroonian Mobile Money collection channel.
 *
 * The bundled adapter is `manual`: the promoter transfers the fee with MTN MoMo (*126#) or Orange
 * Money (#150#) to the platform's merchant wallet and an administrator confirms the transaction.
 * A live aggregator — Campay, MeSomb, Notch Pay, Flutterwave, the MTN MoMo API or the Orange Money
 * API — only has to implement this contract and be registered in PaymentsModule under
 * PAYMENT_PROVIDER; it can then settle transactions without an administrator touching them.
 */
export abstract class MobileMoneyProvider {
  abstract readonly name: string;
  /** true when the provider confirms transactions by itself, false when an administrator does. */
  abstract readonly automatic: boolean;
  abstract readonly supportedMethods: PaymentMethod[];
  abstract collect(request: CollectRequest): Promise<CollectResult>;
  /** Send a confirmed transfer back to the promoter's wallet (done in the MTN / Orange merchant portal). */
  abstract refund(providerRef: string, amount: number, currency: string): Promise<RefundResult>;
}
