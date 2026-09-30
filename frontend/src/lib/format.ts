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
