import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import MosaicHome from "./pages/mosaic/MosaicHome.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
const path = window.location.pathname;

if (path === "/login" || path === "/dashboard" || path === "/app") {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <MosaicHome />
    </React.StrictMode>
  );
}
