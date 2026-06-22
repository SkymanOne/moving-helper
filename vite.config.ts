import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
    // TODO: Remove this once we have a proper domain for the app
    allowedHosts: [".ts.net"],
  },
});
