import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Backend mounts its router with no prefix (see backend/app/main.py),
      // so routes live at /books, not /api/books. Proxy that path directly.
      "/books": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
