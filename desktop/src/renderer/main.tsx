import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./design/globals.css";
import "./design/prose-agent.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
