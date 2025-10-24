import { useEffect, useState } from 'react';

function getInitialOfflineState() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return !navigator.onLine;
}

export function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(getInitialOfflineState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center bg-amber-500 px-4 py-2 text-sm text-neutral-900 shadow-md">
      <span className="font-medium">
        You&apos;re offline—progress will sync when you reconnect.
      </span>
    </div>
  );
}

export default OfflineStatusBanner;
