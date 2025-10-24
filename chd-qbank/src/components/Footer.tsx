import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} CHD QBank. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-neutral-700 underline">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className="hover:text-neutral-700 underline">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <span title={`Build ${__BUILD_HASH__}`}>v{__APP_VERSION__}</span>
        </nav>
      </div>
    </footer>
  );
}
