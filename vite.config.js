import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },
  plugins: [react()],
  server: {
    port: 4028,
    host: "0.0.0.0",
    strictPort: false,
  },
  resolve: {
    alias: {
      src: "/src",
    },
  },
});
