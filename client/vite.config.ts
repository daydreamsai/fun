import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 7575,
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
