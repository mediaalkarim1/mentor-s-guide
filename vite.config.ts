import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isGitHubPages = process.env['GITHUB_PAGES'] === "true";

export default defineConfig({
  vite: {
    base: isGitHubPages ? "/mentor-s-guide/" : "/",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
