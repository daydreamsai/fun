import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./index.css";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSettingsStore } from "./store/settingsStore";

// Initialize settings store before creating the agent
// This ensures the store is hydrated from localStorage before agent creation
useSettingsStore.getState();

const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  // Add dehydrate/rehydrate options for proper SSR handling
  defaultPreload: "intent",
  // Add proper handling for direct navigation
  defaultPreloadStaleTime: 0,
  defaultOnCatch(error, errorInfo) {
    console.log({ error, errorInfo });
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;

// Remove the conditional check that can cause hydration mismatches
const root = ReactDOM.createRoot(rootElement, {
  onRecoverableError(error, errorInfo) {
    console.log(error, errorInfo);
  },
});

try {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
} catch (error) {
  console.log(error);
}
