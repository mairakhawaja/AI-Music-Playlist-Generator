import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

/**
 * Wraps protected routes. Checks authentication on mount.
 * - While loading: shows a fullscreen spinner
 * - If not authenticated: redirects to "/"
 * - If authenticated: renders child routes via <Outlet />
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    // Only check auth if we haven't already determined auth state
    if (isLoading) {
      checkAuth();
    }
  }, [checkAuth, isLoading]);

  if (isLoading) {
    return <LoadingSpinner variant="fullscreen" label="Checking session" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
