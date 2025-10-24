import classNames from "classnames";
import { Link } from "react-router-dom";
import { useFeatureFlagsStore } from "../store/featureFlags";

export default function Footer() {
  const darkModeEnabled = useFeatureFlagsStore((state) => state.darkModeEnabled);

  const footerClasses = classNames(
    "border-t",
    darkModeEnabled ? "border-neutral-800 bg-neutral-900 text-neutral-300" : "border-neutral-200 bg-white"
  );

  const linkClasses = classNames(
    "underline",
    darkModeEnabled ? "hover:text-white" : "hover:text-neutral-700"
  );

  const textClasses = darkModeEnabled ? "text-neutral-400" : "text-neutral-500";

  return (
    <footer className={footerClasses}>
      <div
        className={classNames(
          "mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between",
          textClasses
        )}
      >
        <p>© {new Date().getFullYear()} CHD QBank. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link to="/privacy" className={linkClasses}>
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms" className={linkClasses}>
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <span title={`Build ${__BUILD_HASH__}`}>v{__APP_VERSION__}</span>
        </nav>
      </div>
    </footer>
  );
}
