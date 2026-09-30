/**
 * Formats an amount for user-facing text (notifications, activity feeds).
 * Central African CFA francs have no minor unit and are written "30,000 FCFA" in Cameroon.
 */
export function formatMoney(amount: number, currency = 'XAF'): string {
  if (currency === 'XAF') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))} FCFA`;
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${currency}`;
}

/** Other currency symbols/codes that must not appear in FCFA-only free text such as event budgets. */
export const FOREIGN_CURRENCY_PATTERN = /(\$|€|£|₦|\b(USD|EUR|GBP|NGN|GHS|ZAR|KES|dollars?|euros?|pounds?)\b)/i;
