import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Dev / browser-test helper: lets the candidate flow run without real camera/mic/fullscreen.
// Activated by: npm run dev, VITE_SKIP_PROCTORING=true, localStorage.__E2E_TEST_MODE='true',
// or any URL containing the query param __e2e=true (e.g. /test/<token>?__e2e=true).
if (
    import.meta.env.DEV ||
    localStorage.getItem('__E2E_TEST_MODE') === 'true' ||
    import.meta.env.VITE_SKIP_PROCTORING === 'true' ||
    new URLSearchParams(window.location.search).has('__e2e')
) {
    (window as any).__E2E_TEST_MODE = true;
    localStorage.setItem('__E2E_TEST_MODE', 'true');
    console.info('[dev] Proctoring bypass enabled for local browser testing.');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
