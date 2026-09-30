export function formatDate(value?: string | Date | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-CM', { ...opts, timeZone: 'Africa/Douala' }).format(new Date(value));
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-CM', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatTime(value?: string | Date | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-CM', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatMoney(amount?: number | null, currency = 'XAF') {
  if (amount === null || amount === undefined) return '—';
  if (currency === 'XAF') return `${new Intl.NumberFormat('en-CM', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
  return new Intl.NumberFormat('en-CM', { style: 'currency', currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}

/**
 * Cameroonian mobile numbers use a closed nine-digit plan (+237, no trunk prefix).
 * Accepts the ways users type them and prints `+237 6XX XX XX XX`.
 */
export function formatCameroonPhone(value?: string | null) {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('00237') ? digits.slice(5) : digits.startsWith('237') ? digits.slice(3) : digits;
  if (!/^6\d{8}$/.test(national)) return value;
  return `+237 ${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`;
}

/** Canonical +2376XXXXXXXXX used by the API. */
export function normalizeCameroonPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('00237') ? digits.slice(5) : digits.startsWith('237') ? digits.slice(3) : digits;
  return `+237${national}`;
}

export function formatNumber(n?: number | null) {
  return new Intl.NumberFormat('en-CM').format(n ?? 0);
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function timeAgo(value?: string | Date | null) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value, { day: 'numeric', month: 'short' });
}

export function initials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

export function fullName(p?: { firstName?: string; lastName?: string } | null) {
  return p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';
}

export function humanize(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Value for <input type="datetime-local"> from an ISO string. */
export function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  // Cameroon is UTC+01:00 year-round, independent of the browser timezone.
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}

const fcfaNumber = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

/** Builds the budget text shown to talent from a min/max in FCFA, e.g. "300,000 – 450,000 FCFA". */
export function formatFcfaBudget(min?: number | null, max?: number | null): string | undefined {
  const lo = min ?? undefined;
  const hi = max ?? undefined;
  if (lo !== undefined && hi !== undefined) return lo === hi ? `${fcfaNumber(lo)} FCFA` : `${fcfaNumber(lo)} – ${fcfaNumber(hi)} FCFA`;
  if (lo !== undefined) return `From ${fcfaNumber(lo)} FCFA`;
  if (hi !== undefined) return `Up to ${fcfaNumber(hi)} FCFA`;
  return undefined;
}

/** Reads the min/max back out of a budget string written by formatFcfaBudget (or typed by hand). */
export function parseFcfaBudget(text?: string | null): { min?: number; max?: number } {
  if (!text) return {};
  const nums = (text.match(/\d[\d\s,.\u202f\u00a0]*/g) ?? []).map((n) => Number(n.replace(/[^\d]/g, ''))).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return {};
  if (/^\s*up to/i.test(text)) return { max: nums[0] };
  if (/^\s*from/i.test(text) && nums.length === 1) return { min: nums[0] };
  return nums.length === 1 ? { min: nums[0], max: nums[0] } : { min: nums[0], max: nums[1] };
}
