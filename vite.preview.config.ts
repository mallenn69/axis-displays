import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: resolve("./preview"),
  base: "/",
  publicDir: resolve("./public"),
  plugins: [react(), tailwindcss()],
  define: { "import.meta.env.VITE_DESIGN_PREVIEW": JSON.stringify("true") },
  resolve: {
    alias: [
      { find: "@/lib/quotes.functions", replacement: resolve("./preview/server-stub.ts") },
      { find: "@tanstack/react-start", replacement: resolve("./preview/server-stub.ts") },
      { find: "@", replacement: resolve("./src") },
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve("./preview/index.html"),
        build: resolve("./preview/build/index.html"),
        start: resolve("./preview/start/index.html"),
        compare: resolve("./preview/compare/index.html"),
        churches: resolve("./preview/churches/index.html"),
        churchQuiz: resolve("./preview/churches/quiz/index.html"),
        admin: resolve("./preview/admin/index.html"),
      },
    },
    outDir: resolve("./dist-preview"),
    emptyOutDir: true,
  },
});
