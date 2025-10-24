import { useState, useEffect, useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";
import { classNames } from "../lib/utils";

type NavLinkConfig = { to: string; label: string };

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [session]);

  const navLinks = useMemo<NavLinkConfig[]>(() => {
    if (!session) return [];
    return [
      { to: "/practice", label: "Practice" },
      { to: "/review", label: "Review" },
      { to: "/games/murmurs", label: "Murmurs" },
      { to: "/games/cxr", label: "CXR Match" },
      ...(leaderboardEnabled && settingsLoaded ? [{ to: "/leaderboard", label: "Leaderboard" }] : [])
    ];
  }, [leaderboardEnabled, session, settingsLoaded]);

  const accountLinks = session
    ? [
        { to: "/profile/alias", label: "Profile" },
        { to: "#signout", label: "Sign out", action: () => { void signOut(); } }
      ]
    : [
        { to: "/login", label: "Login" },
        { to: "/signup", label: "Signup" }
      ];

  const renderNavLink = (link: NavLinkConfig & { action?: () => void }) => {
    if (link.to === "#signout") {
      return (
        <button
          key={link.label}
          type="button"
          onClick={link.action}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-left text-white hover:bg-neutral-700"
        >
          {link.label}
        </button>
      );
    }

    return (
      <NavLink
        key={link.to}
        to={link.to}
        className={({ isActive }) =>
          classNames(
            "block rounded-md px-3 py-2 text-sm transition hover:text-brand-600",
            isActive ? "font-semibold text-brand-700" : "text-neutral-700"
          )
        }
      >
        {link.label}
      </NavLink>
    );
  };

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/dashboard" className="text-lg font-semibold text-brand-600">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3 lg:hidden">
          {session ? (
            <button
              type="button"
              onClick={() => {
                void signOut();
              }}
              className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Sign out
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {menuOpen ? (
                <path
                  fillRule="evenodd"
                  d="M4.25 5.75a.75.75 0 011.5 0v8.5a.75.75 0 01-1.5 0v-8.5zm5 0a.75.75 0 011.5 0v8.5a.75.75 0 01-1.5 0v-8.5zm5 0a.75.75 0 011.5 0v8.5a.75.75 0 01-1.5 0v-8.5z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M2.75 5.5a.75.75 0 01.75-.75h13a.75.75 0 010 1.5h-13a.75.75 0 01-.75-.75zm0 4a.75.75 0 01.75-.75h13a.75.75 0 010 1.5h-13a.75.75 0 01-.75-.75zm0 4a.75.75 0 01.75-.75h13a.75.75 0 010 1.5h-13a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>
        <nav className="hidden items-center gap-2 text-sm lg:flex">
          {navLinks.map((link) => renderNavLink(link))}
          {accountLinks.map((link) =>
            link.to === "#signout" ? (
              <button
                key={link.label}
                type="button"
                onClick={link.action}
                className="rounded-md bg-neutral-900 px-3 py-2 text-white transition hover:bg-neutral-700"
              >
                {link.label}
              </button>
            ) : (
              renderNavLink(link)
            )
          )}
        </nav>
      </div>
      {menuOpen ? (
        <div className="border-t border-neutral-200 bg-white shadow-sm lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm">
            {navLinks.map((link) => renderNavLink(link))}
            <div className={navLinks.length > 0 ? "border-t border-neutral-100 pt-3" : undefined}>
              {accountLinks.map((link) => renderNavLink(link))}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
