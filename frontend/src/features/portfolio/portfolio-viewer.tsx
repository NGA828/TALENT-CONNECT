'use client';

import type { PortfolioItem } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { MEDIA_LIMITS, MediaPreview } from './media';

export function PortfolioViewer({ item, onClose }: { item: PortfolioItem | null; onClose: () => void }) {
  return (
    <Modal open={!!item} onClose={onClose} size="xl" title={item?.title ?? ''} description={item ? MEDIA_LIMITS[item.mediaType].label : undefined}>
      {item && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl bg-slate-100">
            {item.mediaType === 'DOCUMENT' ? (
              <div className="flex flex-col items-center gap-3 p-10"><MediaPreview type="DOCUMENT" url={item.mediaUrl} title={item.title} className="h-28 bg-transparent" /><a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent-700 hover:underline">Open PDF in a new tab</a></div>
            ) : (
              <MediaPreview type={item.mediaType} url={item.mediaUrl} title={item.title} controls className="max-h-[60vh] min-h-48" />
            )}
          </div>
          {item.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.description}</p>}
        </div>
      )}
    </Modal>
  );
}
