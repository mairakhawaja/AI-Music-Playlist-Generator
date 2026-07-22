import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBanner } from "../../components/ui";
import { PlaylistSelector } from "./PlaylistSelector";
import { GenerateButton } from "./GenerateButton";
import { generate } from "./generatorApi";
import "./GeneratorPage.css";

export function GeneratorPage() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    correlationId?: string;
  } | null>(null);

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  }

  async function handleGenerate() {
    setError(null);
    setLoading(true);

    try {
      const result = await generate(selectedIds);
      navigate("/results", { state: result });
    } catch (err: unknown) {
      const correlationId =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "headers" in err.response
          ? (
              (err.response as { headers?: Record<string, string> })
                .headers as Record<string, string>
            )?.["x-correlation-id"]
          : undefined;

      const message =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data &&
        (err.response.data as { error?: { message?: string } }).error?.message
          ? (err.response.data as { error: { message: string } }).error.message
          : "Something went wrong while generating your playlist. Please try again.";

      setError({ message, correlationId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="generator-page">
      <header className="generator-page__header">
        <h1 className="generator-page__title">Generate Playlist</h1>
        <p className="generator-page__subtitle">
          Select playlists to influence your recommendations, or generate based
          on your listening history alone.
        </p>
      </header>

      {error && (
        <ErrorBanner
          message={error.message}
          correlationId={error.correlationId}
        />
      )}

      <PlaylistSelector selectedIds={selectedIds} onToggle={handleToggle} />

      <GenerateButton
        onClick={handleGenerate}
        loading={loading}
        disabled={loading}
      />
    </div>
  );
}
