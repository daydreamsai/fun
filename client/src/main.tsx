import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./index.css";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import { QueryClient } from "@tanstack/react-query";
import { useSettingsStore } from "./store/settingsStore";

// Initialize settings store before creating the agent
// This ensures the store is hydrated from localStorage before agent creation
useSettingsStore.getState();

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient: new QueryClient(),
  },
  // Add dehydrate/rehydrate options for proper SSR handling
  defaultPreload: "intent",
  // Add proper handling for direct navigation
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root")!;

// Remove the conditional check that can cause hydration mismatches
const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
