export interface CardDetails {
  holder: string;
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

export interface ChargeRequest {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  card: CardDetails;
}

export interface ChargeResult {
  success: boolean;
  providerRef: string;
  cardBrand?: string;
  last4?: string;
  failureReason?: string;
}

/**
 * Payment provider abstraction. A live gateway (Stripe, Paystack, Flutterwave, …) only has to
 * implement this contract and be registered in PaymentsModule for PAYMENT_PROVIDER.
 * Card data is forwarded to the provider and is never persisted by Talent Connect.
 */
export abstract class PaymentProvider {
  abstract readonly name: string;
  abstract readonly sandbox: boolean;
  abstract charge(request: ChargeRequest): Promise<ChargeResult>;
  abstract refund(providerRef: string, amount: number, currency: string): Promise<{ success: boolean; providerRef: string; failureReason?: string }>;
}
