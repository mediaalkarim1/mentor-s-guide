import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const isGhPages =
    typeof window !== "undefined"
      ? window.location.pathname.startsWith("/mentor-s-guide")
      : process.env.GITHUB_PAGES === "true";

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    basepath: isGhPages ? "/mentor-s-guide" : undefined,
  });

  return router;
};
