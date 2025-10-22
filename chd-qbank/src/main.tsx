import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
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

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

void registerServiceWorker();
