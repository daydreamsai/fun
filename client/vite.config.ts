import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import mkcert from "vite-plugin-mkcert";
// https://vite.dev/config/
export default defineConfig({
  plugins: [mkcert(), TanStackRouterVite(), react()],
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
    port: 7575,
    proxy: {
      "/ponzi-api": {
        target: "https://api.ponzi.land",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ponzi-api/, "/price"),
        secure: true,
      },
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
