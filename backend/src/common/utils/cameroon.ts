import { PaymentMethod } from '@prisma/client';

/**
 * Cameroon uses a closed nine-digit numbering plan: mobile numbers start with 6, landlines with 2,
 * and the country code is +237 (no trunk prefix). Mobile Money wallets are always mobile numbers.
 */
export const CAMEROON_COUNTRY_CODE = '+237';
export const CAMEROON_MOBILE_REGEX = /^\+2376\d{8}$/;

/** Typical allocations (number portability means a prefix is a hint, not a guarantee). */
export const MTN_PREFIXES = ['650', '651', '652', '653', '654', '67', '68'];
export const ORANGE_PREFIXES = ['655', '656', '657', '658', '659', '69'];

const NATIONAL_MOBILE_REGEX = /^6\d{8}$/;

/**
 * Accepts the ways Cameroonians actually type a number — "677 12 34 56", "+237 677 12 34 56",
 * "00237677123456" — and returns the canonical `+2376XXXXXXXXX` form, or null when it is not a
 * Cameroonian mobile number.
 */
export function normalizeCameroonMobile(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^\d]/g, '');
  const national = digits.startsWith('00237') ? digits.slice(5) : digits.startsWith('237') ? digits.slice(3) : digits;
  return NATIONAL_MOBILE_REGEX.test(national) ? `${CAMEROON_COUNTRY_CODE}${national}` : null;
}

/** Canonical `+2376XXXXXXXXX` → `+237 6XX XX XX XX` for display and receipts. */
export function formatCameroonMobile(value?: string | null): string {
  const normalized = value ? normalizeCameroonMobile(value) : null;
  if (!normalized) return value ?? '—';
  const n = normalized.slice(4);
  return `${CAMEROON_COUNTRY_CODE} ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`;
}

/** True when a Mobile Money number looks like it belongs to the wallet the promoter selected. */
export function matchesNetworkPrefix(value: string | null | undefined, method: PaymentMethod): boolean | null {
  const normalized = value ? normalizeCameroonMobile(value) : null;
  if (!normalized) return null;
  const national = normalized.slice(4);
  const prefixes = method === PaymentMethod.MTN_MOMO ? MTN_PREFIXES : method === PaymentMethod.ORANGE_MONEY ? ORANGE_PREFIXES : null;
  if (!prefixes) return null;
  return prefixes.some((p) => national.startsWith(p));
}

/** Merchant wallets shipped for the demo; an administrator replaces them in Admin → Licence fees. */
export const DEMO_MTN_MOMO_NUMBER = '+237677123456';
export const DEMO_ORANGE_MONEY_NUMBER = '+237699123456';
