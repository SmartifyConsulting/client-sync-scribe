import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useV2Demo } from "@/hooks/useV2Demo";

/**
 * Guards routes that belong to the version 2.0 demo (Biolog, Ask Holarc).
 * Accounts without the v2 demo flag are sent back to their dashboard.
 */
export function V2Route({ children }: { children: ReactNode }) {
  const { v2Demo, isLoading } = useV2Demo();
  if (isLoading) return null;
  if (!v2Demo) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
