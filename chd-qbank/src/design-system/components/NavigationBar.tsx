import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { classNames } from "../../lib/utils";

export interface NavigationLink {
  label: ReactNode;
  to: string;
  end?: boolean;
  badge?: ReactNode;
  onClick?: () => void;
}

export interface NavigationBarProps {
  brand: ReactNode;
  primaryLinks?: NavigationLink[];
  secondaryLinks?: NavigationLink[];
  actions?: ReactNode;
  mobileActions?: ReactNode;
  className?: string;
}

export function NavigationBar({
  brand,
  primaryLinks = [],
  secondaryLinks = [],
  actions,
  mobileActions,
  className
}: NavigationBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = () => {
    setMobileOpen((value) => !value);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const desktopLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
      "text-neutral-600 hover:text-neutral-900 hover:bg-surface-muted/80",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
      "md:px-3 md:py-2",
      isActive ? "text-neutral-900 bg-surface-muted/80" : "bg-transparent"
    );

  const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
    classNames(
      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      "text-neutral-700 hover:bg-surface-muted hover:text-neutral-900",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
      isActive ? "bg-surface-muted text-neutral-900" : "bg-transparent"
    );

  const renderLink = (link: NavigationLink, size: "desktop" | "mobile") => {
    const classNameFn = size === "desktop" ? desktopLinkClasses : mobileLinkClasses;
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={classNameFn}
        onClick={() => {
          link.onClick?.();
          if (size === "mobile") {
            closeMobile();
          }
        }}
      >
        <span>{link.label}</span>
        {link.badge ? <span className="text-xs font-semibold text-neutral-500">{link.badge}</span> : null}
      </NavLink>
    );
  };

  return (
    <header className={classNames("border-b border-neutral-200 bg-surface-base", className)}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <div className="shrink-0">{brand}</div>
          {primaryLinks.length ? (
            <nav className="hidden items-center gap-2 md:flex">
              {primaryLinks.map((link) => renderLink(link, "desktop"))}
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {secondaryLinks.length ? (
            <nav className="hidden items-center gap-2 md:flex">
              {secondaryLinks.map((link) => renderLink(link, "desktop"))}
            </nav>
          ) : null}
          {actions}
          {primaryLinks.length || secondaryLinks.length || mobileActions ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-2 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-surface-muted md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="ds-navigation-mobile"
              aria-label="Toggle navigation menu"
              onClick={handleToggle}
            >
              <span className="sr-only">Toggle navigation menu</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          ) : null}
        </div>
      </div>
      {mobileOpen ? (
        <div id="ds-navigation-mobile" className="md:hidden">
          <div className="border-t border-neutral-200 px-4 pb-4 pt-4">
            {primaryLinks.length ? (
              <nav className="space-y-1">
                {primaryLinks.map((link) => renderLink(link, "mobile"))}
              </nav>
            ) : null}
            {secondaryLinks.length ? (
              <nav className="mt-4 space-y-1 border-t border-neutral-100 pt-4">
                {secondaryLinks.map((link) => renderLink(link, "mobile"))}
              </nav>
            ) : null}
            {mobileActions ? <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">{mobileActions}</div> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
