import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const App = lazy(() => import("./App.jsx"));
const MosaicHome = lazy(() => import("./pages/mosaic/MosaicHome.jsx"));

const root = createRoot(document.getElementById("root"));
const path = window.location.pathname;

if (path === "/login" || path === "/dashboard" || path === "/app") {
  root.render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <MosaicHome />
      </Suspense>
    </React.StrictMode>
  );
}
