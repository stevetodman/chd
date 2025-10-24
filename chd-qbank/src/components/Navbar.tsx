import { useState } from "react";
import classNames from "classnames";
import { Link, NavLink } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryLinks = [
    { to: "/practice", label: "Practice" },
    { to: "/review", label: "Review" },
    { to: "/games/murmurs", label: "Murmurs" },
    { to: "/games/cxr", label: "CXR Match" }
  ];

  if (leaderboardEnabled && settingsLoaded) {
    primaryLinks.push({ to: "/leaderboard", label: "Leaderboard" });
  }

  const accountLinks = session
    ? [{ to: "/profile/alias", label: "Profile" }]
    : [
        { to: "/login", label: "Login" },
        { to: "/signup", label: "Signup" }
      ];

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "block rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-50 hover:text-neutral-900 md:rounded-none md:px-0 md:py-0 md:text-sm md:hover:bg-transparent md:border-b-2 md:border-transparent dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
      isActive
        ? "text-neutral-900 md:border-brand-500 dark:text-neutral-50 dark:md:border-brand-400"
        : "text-neutral-600 dark:text-neutral-300"
    );

  const secondaryLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "text-sm font-medium transition-colors hover:text-neutral-900 dark:hover:text-neutral-100",
      isActive ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-300"
    );

  const handleNavLinkClick = () => {
    setMobileOpen(false);
  };

  return (
    <header className="border-b border-neutral-200 bg-white transition-colors dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/dashboard" className="text-lg font-semibold text-brand-600 transition-colors dark:text-brand-300">
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <nav className="hidden items-center gap-6 md:flex">
                  {primaryLinks.map((link) => (
                    <NavLink key={link.to} to={link.to} className={linkClasses}>
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="hidden items-center gap-3 md:flex">
                  <NavLink to="/profile/alias" className={linkClasses}>
                    Profile
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                    }}
                    className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
                {accountLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={secondaryLinkClasses}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-2 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 md:hidden dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation menu"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">Toggle navigation menu</span>
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {mobileOpen ? (
          <div className="mt-4 space-y-6 border-t border-neutral-200 pt-4 md:hidden dark:border-neutral-800">
            {session ? (
              <nav className="space-y-1">
                {primaryLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClasses} onClick={handleNavLinkClick}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
            <div className="space-y-1 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              {accountLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClasses} onClick={handleNavLinkClick}>
                  {link.label}
                </NavLink>
              ))}
              {session ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
