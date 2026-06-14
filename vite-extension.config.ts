import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist-extension",
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "extension/popup.html"),
        auth: resolve(__dirname, "extension/auth.html"),
        background: resolve(__dirname, "extension/background.js")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]"
      }
    }
  }
});
