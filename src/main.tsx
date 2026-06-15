// Prevent fetch polyfills from crashing the app with "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, "fetch", {
      configurable: true,
      enumerable: true,
      get: () => originalFetch,
      set: () => {
        /* Prevent overwriting */
      },
    });
  } catch (e) {
    // ignore
  }
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
