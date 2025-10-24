import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/70 px-6 py-5 text-sm text-neutral-500 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-neutral-600">© {new Date().getFullYear()} CHD QBank. All rights reserved.</p>
          <p className="text-xs text-neutral-400">Crafted for cardiology excellence—secure, reliable, and fast.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-neutral-500">
          <Link to="/privacy" className="transition hover:text-brand-600">Privacy</Link>
          <Link to="/terms" className="transition hover:text-brand-600">Terms</Link>
          <span className="hidden h-4 w-px bg-neutral-300/50 sm:block" aria-hidden="true" />
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white shadow-sm" title={`Build ${__BUILD_HASH__}`}>
            v{__APP_VERSION__}
          </span>
        </nav>
      </div>
    </footer>
  );
}
