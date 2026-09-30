'use client';

import { Smartphone } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { PaymentConfig, PaymentMethodOption } from '@/lib/types';

/**
 * How the licence fee is paid in Cameroon: a Mobile Money transfer with MTN MoMo (*126#) or
 * Orange Money (#150#) to the wallet administrators manage, confirmed by an administrator.
 */
export function MobileMoneyBanner({ config }: { config: PaymentConfig }) {
  const methods = config.methods.filter((m) => m.enabled);
  if (methods.length === 0) {
    return (
      <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Smartphone className="mt-0.5 size-4 shrink-0" />
        <p><strong>Mobile Money is paused.</strong> The platform has not enabled MTN MoMo or Orange Money at the moment. Contact support.</p>
      </div>
    );
  }
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <Smartphone className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong>Paid by Mobile Money.</strong> Send {formatMoney(config.licenceFee, config.currency)} to {config.payeeName} with{' '}
        {methods.map((m, i) => (
          <span key={m.value}>
            {i > 0 ? ' or ' : ''}{m.label} <span className="font-mono">{m.ussd}</span>
          </span>
        ))}{' '}
        — an administrator confirms the transfer before your licence goes for review.
      </p>
    </div>
  );
}

/** The wallet to send the money to, with the USSD steps for one network. */
export function MethodInstructions({ method, fee, payeeName, currency }: { method: PaymentMethodOption; fee: number; payeeName: string; currency: string }) {
  return (
    <ol className="space-y-1.5 text-sm text-slate-600">
      <li>1. Dial <span className="font-mono font-semibold text-slate-900">{method.ussd}</span> on the phone that holds your {method.shortLabel} wallet.</li>
      <li>2. Choose <strong>Transfer</strong>, then send <strong>{formatMoney(fee, currency)}</strong> to <strong className="font-mono">{method.number ?? 'the platform wallet'}</strong>{payeeName ? ` (${payeeName})` : ''}.</li>
      <li>3. Copy the <strong>transaction ID</strong> from the {method.shortLabel} SMS and enter it below with your wallet number.</li>
    </ol>
  );
}
