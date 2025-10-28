import { createElement, type ComponentType, type ReactElement, type ReactNode } from "react";
import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { messages, FALLBACK_LOCALE } from "../locales";

type Wrapper = RenderOptions["wrapper"];

type CustomRenderOptions = Omit<RenderOptions, "wrapper"> & {
  wrapper?: Wrapper;
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider initialLocale="en" fallbackLocale={FALLBACK_LOCALE} messages={messages}>
      {children}
    </I18nProvider>
  );
}

export function render(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { wrapper, ...rest } = options;

  const ProviderWrapper = ({ children }: { children: ReactNode }) => (
    <Providers>
      {wrapper ? createElement(wrapper as ComponentType<{ children: ReactNode }>, undefined, children) : children}
    </Providers>
  );

  return rtlRender(ui, { ...rest, wrapper: ProviderWrapper as ComponentType<{ children: ReactNode }> });
}

export * from "@testing-library/react";
