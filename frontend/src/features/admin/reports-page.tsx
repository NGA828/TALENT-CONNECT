'use client';

import { useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { formatDateTime, humanize } from '@/lib/format';
import type { ReportResult } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Alert, EmptyState, Spinner } from '@/components/ui/feedback';

const TYPES = [
  { id: 'users', label: 'Users', desc: 'Every registered account with role, status and join date.' },
  { id: 'events', label: 'Events', desc: 'Events with promoter, status, enrolments and contracts.' },
  { id: 'contracts', label: 'Contracts', desc: 'Contracts with parties, amounts and status.' },
  { id: 'payments', label: 'Payments', desc: 'Licence-fee payments with provider status.' },
  { id: 'verifications', label: 'Verifications', desc: 'History of licence approvals and rejections.' },
  { id: 'moderation', label: 'Moderation', desc: 'Portfolio items that were flagged or removed.' },
] as const;

export function ReportsPage() {
  const toast = useToast();
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('users');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidRange = !!from && !!to && from > to;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api.get<ReportResult>(`/admin/reports/${type}`, { from: from || undefined, to: to || undefined }));
    } catch (err) {
      setReport(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await api.download(`/admin/reports/${type}`, { format: 'csv', from: from || undefined, to: to || undefined }, `talent-connect-${type}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader title="Reports" description="Generate a report from live data, review it on screen and export it as CSV." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit p-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Report type</legend>
            <div className="space-y-1.5">
              {TYPES.map((t) => (
                <label key={t.id} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3', type === t.id ? 'border-accent-600 bg-accent-50' : 'border-transparent hover:bg-slate-50')}>
                  <input type="radio" name="report-type" className="mt-1 accent-[var(--color-accent-600)]" checked={type === t.id} onChange={() => { setType(t.id); setReport(null); setError(null); }} />
                  <span><span className="block text-sm font-semibold text-slate-900">{t.label}</span><span className="block text-xs text-slate-500">{t.desc}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {invalidRange && <p className="mt-2 text-sm text-red-600" role="alert">The start date must be before the end date.</p>}
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={generate} loading={loading} disabled={invalidRange}><FileBarChart className="size-4" /> Generate</Button>
            <Button variant="outline" onClick={download} loading={downloading} disabled={invalidRange} aria-label="Download CSV"><Download className="size-4" /> CSV</Button>
          </div>
        </Card>

        <div className="min-w-0">
          {loading ? <div className="flex justify-center py-20"><Spinner /></div> : error ? <Alert tone="danger">{error}</Alert> : !report ? (
            <EmptyState icon={<FileBarChart className="size-6" />} title="No report generated yet" description="Choose a report type and optional date range, then press Generate." />
          ) : (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                <div><h2 className="font-semibold text-slate-900">{report.title}</h2><p className="text-xs text-slate-500">{report.total} row{report.total === 1 ? '' : 's'} · generated {formatDateTime(report.generatedAt)}</p></div>
              </div>
              {report.rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No records in this period.</p> : (
                <div className="max-h-[32rem] overflow-auto">
                  <table className="w-full min-w-max text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{report.columns.map((c) => <th key={c} className="whitespace-nowrap px-4 py-2.5 font-semibold">{humanize(c)}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.rows.slice(0, 200).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">{report.columns.map((c) => <td key={c} className="whitespace-nowrap px-4 py-2 text-slate-700">{fmt(r[c])}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {report.rows.length > 200 && <p className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500">Showing the first 200 rows. Download the CSV for the full report.</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return String(v);
}
