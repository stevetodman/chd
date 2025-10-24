import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./i18n";
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

const locale = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider locale={locale}>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>
);

void registerServiceWorker();
