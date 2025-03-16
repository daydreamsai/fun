import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "@tanstack/react-router"],
        },
      },
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
