import { Suspense } from 'react';
import { MessagesView } from '@/features/messaging/messages-view';

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  );
}
