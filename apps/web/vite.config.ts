import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const packageEntry = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@entropylab/core": packageEntry("core"),
      "@entropylab/fixtures": packageEntry("fixtures"),
      "@entropylab/report": packageEntry("report"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "EntropyLab",
        short_name: "EntropyLab",
        description:
          "Offline profiling for physical Bitcoin entropy processes before they are trusted with a seed.",
        theme_color: "#14181d",
        background_color: "#e9ecf0",
        display: "standalone",
        start_url: "./",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        // Precache the built application only. There are no runtime caching
        // rules because there are no runtime requests: analysis is computed in
        // the page and nothing is fetched after load.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
});
