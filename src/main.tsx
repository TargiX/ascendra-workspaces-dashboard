import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import "./styles.css";

async function enableMocking() {
  if (import.meta.env.VITE_DISABLE_MSW === "true") return;

  const { worker } = await import("./mocks/browser");
  return worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AppProviders router={router} />
    </React.StrictMode>,
  );
});
