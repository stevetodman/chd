import { useState } from "react";
import classNames from "classnames";
import { Link, NavLink } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";
import { useFeatureFlagsStore } from "../store/featureFlags";

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));
  const {
    darkModeEnabled,
    toggleDarkMode,
    tutorModeEnabled,
    learningGamesEnabled
  } = useFeatureFlagsStore((state) => ({
    darkModeEnabled: state.darkModeEnabled,
    toggleDarkMode: state.toggleDarkMode,
    tutorModeEnabled: state.tutorModeEnabled,
    learningGamesEnabled: state.learningGamesEnabled
  }));
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryLinks = [
    ...(tutorModeEnabled ? [{ to: "/practice", label: "Practice" }] : []),
    { to: "/review", label: "Review" },
    ...(learningGamesEnabled
      ? [
          { to: "/games/murmurs", label: "Murmurs" },
          { to: "/games/cxr", label: "CXR Match" }
        ]
      : [])
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
      "block rounded px-3 py-2 text-sm font-medium transition-colors md:rounded-none md:px-0 md:py-0 md:text-sm md:hover:bg-transparent md:border-b-2 md:border-transparent",
      darkModeEnabled
        ? "hover:bg-neutral-800 hover:text-neutral-100"
        : "hover:bg-neutral-50 hover:text-neutral-900",
      isActive
        ? darkModeEnabled
          ? "text-white md:border-brand-400"
          : "text-neutral-900 md:border-brand-500"
        : darkModeEnabled
          ? "text-neutral-300"
          : "text-neutral-600"
    );

  const secondaryLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "text-sm font-medium transition-colors",
      darkModeEnabled ? "hover:text-white" : "hover:text-neutral-900",
      isActive
        ? darkModeEnabled
          ? "text-white"
          : "text-neutral-900"
        : darkModeEnabled
          ? "text-neutral-300"
          : "text-neutral-600"
    );

  const handleNavLinkClick = () => {
    setMobileOpen(false);
  };

  const headerClasses = classNames(
    "border-b",
    darkModeEnabled ? "border-neutral-800 bg-neutral-900 text-neutral-100" : "border-neutral-200 bg-white"
  );

  const toggleButtonClasses = classNames(
    "inline-flex items-center justify-center rounded-md border px-2 py-2 text-sm font-medium transition-colors",
    darkModeEnabled
      ? "border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
  );

  return (
    <header className={headerClasses}>
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/dashboard" className="text-lg font-semibold text-brand-600">
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
                    className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
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
              onClick={toggleDarkMode}
              aria-pressed={darkModeEnabled}
              className={toggleButtonClasses}
            >
              {darkModeEnabled ? "Light mode" : "Dark mode"}
            </button>
            <button
              type="button"
              className={classNames(
                "inline-flex items-center justify-center rounded-md border px-2 py-2 text-sm font-medium transition-colors md:hidden",
                darkModeEnabled
                  ? "border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              )}
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
          <div
            className={classNames(
              "mt-4 space-y-6 border-t pt-4 md:hidden",
              darkModeEnabled ? "border-neutral-800" : "border-neutral-200"
            )}
          >
            {session ? (
              <nav className="space-y-1">
                {primaryLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClasses} onClick={handleNavLinkClick}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
            <div
              className={classNames(
                "space-y-1 border-t pt-4",
                darkModeEnabled ? "border-neutral-800" : "border-neutral-100"
              )}
            >
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
                  className={classNames(
                    "w-full rounded px-3 py-2 text-sm font-medium transition-colors",
                    darkModeEnabled
                      ? "bg-neutral-100 text-neutral-900 hover:bg-white"
                      : "bg-neutral-900 text-white hover:bg-neutral-700"
                  )}
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
