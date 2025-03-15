import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/gigaverse-api": {
        target: "https://gigaverse.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gigaverse-api/, "/api"),
        secure: true,
        headers: {
          Referer: "https://gigaverse.io/",
          Origin: "https://gigaverse.io",
        },
      },
    },
  },
});
