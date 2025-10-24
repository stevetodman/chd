import { useMemo, useState } from "react";
import classNames from "classnames";
import { Link, NavLink } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { signOut, useSessionStore } from "../lib/auth";
import { useSettingsStore } from "../lib/settings";
import { useI18n } from "../i18n";

export default function Navbar() {
  const { session } = useSessionStore();
  const { leaderboardEnabled, loaded: settingsLoaded } = useSettingsStore((state) => ({
    leaderboardEnabled: state.leaderboardEnabled,
    loaded: state.loaded
  }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  const basePrimaryLinks = useMemo(
    () => [
      { to: "/practice", label: t("nav.practice", { defaultValue: "Practice" }) },
      { to: "/review", label: t("nav.review", { defaultValue: "Review" }) },
      { to: "/games/murmurs", label: t("nav.games.murmurs", { defaultValue: "Murmurs" }) },
      { to: "/games/cxr", label: t("nav.games.cxr", { defaultValue: "CXR Match" }) }
    ],
    [t]
  );

  const primaryLinks = useMemo(() => {
    const links = [...basePrimaryLinks];
    if (leaderboardEnabled && settingsLoaded) {
      links.push({ to: "/leaderboard", label: t("nav.leaderboard", { defaultValue: "Leaderboard" }) });
    }
    return links;
  }, [basePrimaryLinks, leaderboardEnabled, settingsLoaded, t]);

  const accountLinks = useMemo(() => {
    if (session) {
      return [{ to: "/profile/alias", label: t("nav.profile", { defaultValue: "Profile" }) }];
    }
    return [
      { to: "/login", label: t("nav.login", { defaultValue: "Login" }) },
      { to: "/signup", label: t("nav.signup", { defaultValue: "Signup" }) }
    ];
  }, [session, t]);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "block rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-50 hover:text-neutral-900 md:rounded-none md:px-0 md:py-0 md:text-sm md:hover:bg-transparent md:border-b-2 md:border-transparent",
      isActive ? "text-neutral-900 md:border-brand-500" : "text-neutral-600"
    );

  const secondaryLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "text-sm font-medium transition-colors hover:text-neutral-900",
      isActive ? "text-neutral-900" : "text-neutral-600"
    );

  const handleNavLinkClick = () => {
    setMobileOpen(false);
  };

  return (
    <header className="border-b border-neutral-200 bg-white">
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
                    {t("nav.profile", { defaultValue: "Profile" })}
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                    }}
                    className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                  >
                    {t("nav.signOut", { defaultValue: "Sign out" })}
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
              className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-2 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 md:hidden"
              aria-expanded={mobileOpen}
              aria-label={t("nav.toggleMenu", { defaultValue: "Toggle navigation menu" })}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">{t("nav.toggleMenu", { defaultValue: "Toggle navigation menu" })}</span>
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
          <div className="mt-4 space-y-6 border-t border-neutral-200 pt-4 md:hidden">
            {session ? (
              <nav className="space-y-1">
                {primaryLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClasses} onClick={handleNavLinkClick}>
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            ) : null}
            <div className="space-y-1 border-t border-neutral-100 pt-4">
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
                  className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                >
                  {t("nav.signOut", { defaultValue: "Sign out" })}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
