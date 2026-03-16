import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

export function usePlatformAdmin() {
  const admin = useQuery(api.platformAdmins.getMe);
  return admin;
}
