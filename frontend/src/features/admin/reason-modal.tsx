'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';

export function ReasonModal({ open, onClose, onSubmit, title, description, label = 'Reason', required = false, confirmLabel, tone = 'primary', busy }: {
  open: boolean; onClose: () => void; onSubmit: (reason: string) => void | Promise<void>; title: string; description?: string; label?: string; required?: boolean; confirmLabel: string; tone?: 'primary' | 'danger'; busy?: boolean;
}) {
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setText(''); setTouched(false); } }, [open]);
  const invalid = required && text.trim().length < 3;
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={busy} onClick={() => { setTouched(true); if (!invalid) void onSubmit(text.trim()); }}>{confirmLabel}</Button></>}>
      <Textarea label={label} rows={4} value={text} maxLength={400} required={required} onChange={(e) => setText(e.target.value)} error={touched && invalid ? 'Please explain the decision (at least 3 characters).' : undefined} hint={required ? 'Shown to the user in their notification.' : 'Optional. Shown to the user in their notification.'} />
    </Modal>
  );
}
