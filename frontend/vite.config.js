import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: '/legal-doc-reviewer/',
  server: {
    port: 5173,
  },
});

