import { useMemo, useState } from "react";
import classNames from "classnames";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";
import { Button } from "./ui/Button";

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const brandPrefix = APP_NAME.trim().split(" ")[0] || "CHD";

  const primaryLinks = useMemo(() => {
    const base = [
      { to: "/practice", label: "Practice" },
      { to: "/review", label: "Review" },
      { to: "/games/murmurs", label: "Murmurs" },
      { to: "/games/cxr", label: "CXR Match" }
    ];
    if (leaderboardEnabled && settingsLoaded) {
      base.push({ to: "/leaderboard", label: "Leaderboard" });
    }
    return base;
  }, [leaderboardEnabled, settingsLoaded]);

  const accountLinks = session
    ? [{ to: "/profile/alias", label: "Profile", accent: false }]
    : [
        { to: "/login", label: "Log in", accent: false },
        { to: "/signup", label: "Request access", accent: true }
      ];

  const desktopLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "relative inline-flex items-center px-1 text-sm font-semibold tracking-tight text-neutral-500 transition-colors duration-150 md:after:absolute md:after:-bottom-2 md:after:left-0 md:after:h-0.5 md:after:w-full md:after:rounded-full md:after:bg-gradient-to-r md:after:from-brand-500 md:after:to-brand-400 md:after:opacity-0 md:after:transition-opacity",
      isActive
        ? "text-brand-600 md:after:opacity-100"
        : "hover:text-neutral-900 md:hover:after:opacity-100"
    );

  const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "block rounded-xl px-4 py-3 text-sm font-semibold tracking-tight transition-colors",
      isActive ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-100"
    );

  const handleNavLinkClick = () => {
    setMobileOpen(false);
  };

  return (
    <header className="relative z-30 mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/80 px-4 py-3 shadow-lg backdrop-blur">
        <Link
          to="/dashboard"
          className="group flex items-center gap-3 rounded-xl px-1 py-1 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-semibold uppercase tracking-widest text-white shadow-md">
            Q
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold uppercase tracking-[0.35em] text-neutral-400 group-hover:text-brand-500">
              {brandPrefix}
            </span>
            <span className="block text-lg font-semibold text-neutral-900 group-hover:text-brand-600 transition-colors">
              {APP_NAME}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <nav className="hidden items-center gap-6 md:flex">
                {primaryLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={desktopLinkClasses}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <div className="hidden items-center gap-3 md:flex">
                <NavLink to="/profile/alias" className={desktopLinkClasses}>
                  Profile
                </NavLink>
                <Button
                  type="button"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <NavLink to="/login" className={desktopLinkClasses}>
                Log in
              </NavLink>
              <Button onClick={() => navigate("/signup")}>Request access</Button>
            </div>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/80 text-neutral-700 shadow-sm transition-all duration-150 hover:scale-105 hover:text-neutral-900 md:hidden"
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
        <div className="mt-4 space-y-4 rounded-2xl border border-white/15 bg-white/80 p-4 shadow-xl backdrop-blur md:hidden">
          {session ? (
            <nav className="space-y-2">
              {primaryLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={mobileLinkClasses} onClick={handleNavLinkClick}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
          <div className="space-y-2 border-t border-white/60 pt-4">
            {accountLinks.map((link) => (
              link.accent ? (
                <Button
                  key={link.to}
                  type="button"
                  className="w-full justify-center"
                  onClick={() => {
                    handleNavLinkClick();
                    navigate(link.to);
                  }}
                >
                  {link.label}
                </Button>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={mobileLinkClasses}
                  onClick={handleNavLinkClick}
                >
                  {link.label}
                </NavLink>
              )
            ))}
            {session ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setMobileOpen(false);
                  void signOut();
                }}
              >
                Sign out
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
