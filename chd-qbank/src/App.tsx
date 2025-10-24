import { Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageState from './components/PageState';
import OfflineStatusBanner from './components/OfflineStatusBanner';
import { AppRoutes } from './routes';
import { getSession, useSessionStore } from './lib/auth';
import { useServiceWorkerUpdates } from './hooks/useServiceWorkerUpdates';
import { useI18n } from './i18n';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/privacy', '/terms']);

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading, initialized } = useSessionStore();
  const { updateVersion, confirmUpdate, dismissUpdate } = useServiceWorkerUpdates();
  const { t } = useI18n();

  useEffect(() => {
    void getSession();
  }, []);

  useEffect(() => {
    if (loading || !initialized) return;
    const isPublicRoute = PUBLIC_ROUTES.has(location.pathname);
    if (!session && !isPublicRoute) {
      navigate('/login', { replace: true });
    }
  }, [session, loading, initialized, location.pathname, navigate]);

  return (
    <>
      <OfflineStatusBanner />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
            <PageState
              title={t('app.loading.title', { defaultValue: 'Loading the app' })}
              description={t('app.loading.description', {
                defaultValue: 'Hang tight while we prep your workspace.',
              })}
              fullHeight
            />
          </div>
        }
      >
        <AppRoutes />
      </Suspense>
      {updateVersion && (
        <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg bg-neutral-900 px-4 py-3 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">
              <p className="font-semibold">
                {t('app.updateReady', { defaultValue: 'A new version is ready.' })}
              </p>
              <p className="text-neutral-300">
                {t('app.updateVersion', {
                  defaultValue: 'Version {version}',
                  version: updateVersion,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmUpdate}
                className="rounded bg-white px-3 py-1 text-sm font-medium text-neutral-900 shadow"
              >
                {t('app.updateReload', { defaultValue: 'Reload' })}
              </button>
              <button
                type="button"
                onClick={dismissUpdate}
                className="text-sm text-neutral-300 underline-offset-2 hover:underline"
              >
                {t('app.updateLater', { defaultValue: 'Later' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
