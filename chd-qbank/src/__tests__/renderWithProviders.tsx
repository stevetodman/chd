import { ReactElement } from "react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { FALLBACK_LOCALE, messages } from "../locales";

type RenderWithProvidersOptions = {
  routerProps?: MemoryRouterProps;
  locale?: string;
  fallbackLocale?: string;
} & RenderOptions;

export function renderWithProviders(
  ui: ReactElement,
  { routerProps, locale = FALLBACK_LOCALE, fallbackLocale = FALLBACK_LOCALE, ...renderOptions }: RenderWithProvidersOptions = {}
): RenderResult {
  const memoryRouterProps: MemoryRouterProps = {
    initialEntries: ["/"],
    ...(routerProps ?? {})
  };

  return render(
    <MemoryRouter {...memoryRouterProps}>
      <I18nProvider initialLocale={locale} fallbackLocale={fallbackLocale} messages={messages}>
        {ui}
      </I18nProvider>
    </MemoryRouter>,
    renderOptions
  );
}
