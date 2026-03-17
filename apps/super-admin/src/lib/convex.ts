import { ConvexReactClient } from "convex/react";
import { fetchToken } from "./auth";

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

convex.setAuth(fetchToken);
