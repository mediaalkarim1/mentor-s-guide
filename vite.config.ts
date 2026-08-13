import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isGitHubPages = process.env['GITHUB_PAGES'] === "true";

export default defineConfig({
  vite: {
    base: isGitHubPages ? "/mentor-s-guide/" : "/",
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ["/", "/mutabaah", "/panduan", "/login"],
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
