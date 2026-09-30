import { FlaskConical } from 'lucide-react';
import type { PaymentConfig } from '@/lib/types';

export function SandboxBanner({ config }: { config: PaymentConfig }) {
  if (!config.sandbox) return null;
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p><strong>Sandbox mode.</strong> Payments are processed by the <span className="font-mono text-[13px]">{config.provider}</span> test provider. No real money moves and no real card should be entered. Use one of the test cards in the payment form.</p>
    </div>
  );
}
