import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./theme.css";
import "./i18n";
import { ThemeProvider } from "./context/ThemeContext";

// Remove the HTML loader indicator once React hydrates
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

// Remove loading spinner after first React frame
requestAnimationFrame(() => requestAnimationFrame(removeLoader));
