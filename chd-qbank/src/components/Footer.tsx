import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white transition-colors dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-neutral-500 transition-colors dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} CHD QBank. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link to="/privacy" className="underline transition-colors hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="underline transition-colors hover:text-neutral-700 dark:text-neutral-300 dark:hover:text-neutral-100">Terms</Link>
          <span aria-hidden="true">·</span>
          <span title={`Build ${__BUILD_HASH__}`} className="text-neutral-600 dark:text-neutral-300">v{__APP_VERSION__}</span>
        </nav>
      </div>
    </footer>
  );
}
