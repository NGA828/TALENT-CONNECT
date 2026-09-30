'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { formatBytes } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { PortfolioItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Textarea } from '@/components/ui/form';
import { Alert } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { ACCEPT, checkFile, MediaPreview } from './media';

const schema = z.object({
  title: z.string().trim().min(2, 'Give your work a title.').max(120, 'Keep the title under 120 characters.'),
  description: z.string().trim().max(1500, 'Keep the description under 1,500 characters.').optional(),
  isPublished: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function PortfolioFormModal({ open, onClose, existing, onSaved }: { open: boolean; onClose: () => void; existing?: PortfolioItem; onSaved: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { title: existing?.title ?? '', description: existing?.description ?? '', isPublished: existing?.isPublished ?? true },
  });

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    const problem = checkFile(f);
    setFileError(problem);
    setFile(problem ? null : f);
  };

  const close = () => {
    setFile(null);
    setFileError(null);
    setFormError(null);
    reset();
    onClose();
  };

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    if (!existing && !file) {
      setFileError('Choose a file to upload.');
      return;
    }
    const form = new FormData();
    form.append('title', v.title);
    form.append('description', v.description ?? '');
    form.append('isPublished', String(v.isPublished));
    if (file) form.append('file', file);
    try {
      await api.upload(existing ? 'PATCH' : 'POST', existing ? `/portfolios/${existing.id}` : '/portfolios', form);
      toast.success(existing ? 'Portfolio item updated.' : 'Portfolio item added.');
      close();
      onSaved();
    } catch (err) {
      if (applyServerErrors(err, setError)) return;
      setFormError(errorMessage(err));
    }
  });

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={existing ? 'Edit portfolio item' : 'Add to your portfolio'}
      description="Images, video, audio and PDFs are supported. Files are checked when you upload them."
      footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={submit} loading={isSubmitting}>{existing ? 'Save changes' : 'Upload'}</Button></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-800">{existing ? 'Replace file (optional)' : 'File'}{!existing && <span className="ml-0.5 text-red-500">*</span>}</p>
          <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          {file && previewUrl ? (
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {file.type.startsWith('image/') ? <img src={previewUrl} alt="" className="size-full object-cover" /> : <MediaPreview type={file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT'} url="" title="" />}
              </div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{formatBytes(file.size)}</p></div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)} aria-label="Remove selected file"><X className="size-4" /></Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-accent-600 hover:bg-accent-50/40"
            >
              <FileUp className="size-7 text-slate-400" aria-hidden />
              <span className="text-sm font-medium text-slate-800">Click to choose a file, or drag it here</span>
              <span className="text-xs text-slate-500">Images up to 10 MB · Video up to 50 MB · Audio up to 20 MB · PDF up to 10 MB</span>
            </button>
          )}
          {existing && !file && <p className="mt-1.5 text-xs text-slate-500">Current file: {existing.fileName}</p>}
          {fileError && <p role="alert" className="mt-1.5 text-[13px] text-red-600">{fileError}</p>}
        </div>
        <Input label="Title" required placeholder="Neon Rain – Street Series" error={errors.title?.message} {...register('title')} />
        <Textarea label="Description" rows={4} placeholder="Client, location, your role, equipment…" error={errors.description?.message} {...register('description')} />
        <Checkbox label="Publish on my public profile" {...register('isPublished')} />
      </form>
    </Modal>
  );
}
