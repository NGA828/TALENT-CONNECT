import { PaymentMethod } from '@prisma/client';

export interface MobileMoneyMethodInfo {
  value: PaymentMethod;
  /** Name used by the operators themselves in Cameroon. */
  label: string;
  shortLabel: string;
  /** USSD code that opens the transfer menu on the promoter's phone. */
  ussd: string;
  /** Typical Cameroon prefixes, shown as a hint only (mobile number portability applies). */
  prefixes: string;
}

/**
 * The two Mobile Money services that move money in Cameroon. They are both collected on a merchant
 * wallet (see Admin → Licence fees) and confirmed by an administrator unless a live gateway adapter
 * is configured.
 */
export const MOBILE_MONEY_METHODS: MobileMoneyMethodInfo[] = [
  { value: PaymentMethod.MTN_MOMO, label: 'MTN Mobile Money (MoMo)', shortLabel: 'MTN MoMo', ussd: '*126#', prefixes: '67X, 68X, 650–654' },
  { value: PaymentMethod.ORANGE_MONEY, label: 'Orange Money', shortLabel: 'Orange Money', ussd: '#150#', prefixes: '69X, 655–659' },
];

export const METHOD_LABEL: Record<string, string> = {
  MTN_MOMO: 'MTN MoMo',
  ORANGE_MONEY: 'Orange Money',
  OFFLINE: 'Counter payment',
};

export const methodInfo = (method: PaymentMethod) => MOBILE_MONEY_METHODS.find((m) => m.value === method);
