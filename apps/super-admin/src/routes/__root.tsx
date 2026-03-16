import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";
import type { QueryClient } from "@tanstack/react-query";

interface RouterContext {
  convex: ConvexReactClient;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
