import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import { useAuth } from "./useAuth";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ErrorBanner } from "../../components/ui/ErrorBanner";

/**
 * Handles the /callback route after Spotify OAuth redirect.
 * Forwards the `code` and `state` query params to the backend,
 * then navigates to /generate on success.
 */
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | undefined>();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Missing authorization code or state parameter.");
      return;
    }

    const exchangeCode = async () => {
      try {
        await apiClient.get("/auth/callback", {
          params: { code, state },
        });
        await checkAuth();
        navigate("/generate", { replace: true });
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as {
            response?: {
              headers?: Record<string, string>;
              data?: { error?: { message?: string } };
            };
          };
          setCorrelationId(
            axiosErr.response?.headers?.["x-correlation-id"],
          );
          setError(
            axiosErr.response?.data?.error?.message ??
              "Authentication failed. Please try again.",
          );
        } else {
          setError("Authentication failed. Please try again.");
        }
      }
    };

    exchangeCode();
  }, [searchParams, navigate, checkAuth]);

  if (error) {
    return <ErrorBanner message={error} correlationId={correlationId} />;
  }

  return <LoadingSpinner variant="fullscreen" label="Completing login" />;
}
