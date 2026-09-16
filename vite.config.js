import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The capture rig writes footage into video/raw/ while the dev server is
    // running; don't let the watcher full-reload the app mid-recording.
    watch: {
      ignored: ["**/video/**", "**/backend/**"],
    },
  },
});
