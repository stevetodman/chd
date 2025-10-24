import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider, normalizeLocale } from "./i18n";
import { messages, FALLBACK_LOCALE } from "./locales";
import { useLocaleStore } from "./store/i18n";
import "./styles/globals.css";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    return;
  }

  try {
    const registrationUrl = new URL("./service-worker.ts", import.meta.url);
    await navigator.serviceWorker.register(registrationUrl, { type: "module" });
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const availableLocales = Object.keys(messages);
const localeState = useLocaleStore.getState();
const browserLocale = typeof navigator !== "undefined" && navigator.language ? navigator.language : FALLBACK_LOCALE;
const initialLocale = normalizeLocale(localeState.locale || browserLocale, availableLocales, FALLBACK_LOCALE);

if (localeState.locale !== initialLocale) {
  useLocaleStore.setState({ locale: initialLocale });
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider
        initialLocale={initialLocale}
        fallbackLocale={FALLBACK_LOCALE}
        messages={messages}
        onLocaleChange={(nextLocale) => {
          const { setLocale } = useLocaleStore.getState();
          setLocale(nextLocale);
        }}
      >
        <App />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);

void registerServiceWorker();
