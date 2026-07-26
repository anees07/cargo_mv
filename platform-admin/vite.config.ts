import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => {
  const hostingBuild = process.env.VITE_PLATFORM_ADMIN_HOSTING === "1";
  return {
    base: hostingBuild ? "/platform-admin/" : "/",
    plugins: [react(), tailwindcss()],
    server: { port: 4180 },
    build: { outDir: hostingBuild ? "../dist/platform-admin" : "dist" },
  };
});
