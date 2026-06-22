import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./theme.css";
import { ThemeProvider } from "./context/ThemeContext";
import "./i18n/index.js";

function removeLoader() {
  const loader = document.getElementById("root-loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => { try { loader.remove(); } catch(e) {} }, 200);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
);

requestAnimationFrame(() => requestAnimationFrame(removeLoader));
