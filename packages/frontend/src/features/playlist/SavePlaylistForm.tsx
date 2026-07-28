import { useState } from "react";
import { Button, ErrorBanner } from "../../components/ui";
import { savePlaylist } from "./playlistApi";
import { useIncludedUris } from "./trackSelectionStore";
import "./SavePlaylistForm.css";

export interface SavePlaylistFormProps {
  generationId: string;
}

function getDefaultPlaylistName(): string {
  const today = new Date().toISOString().split("T")[0];
  return `AI Music Generator \u2014 ${today}`;
}

export function SavePlaylistForm({ generationId }: SavePlaylistFormProps) {
  const includedUris = useIncludedUris();
  const [playlistName, setPlaylistName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    correlationId?: string;
  } | null>(null);
  const [success, setSuccess] = useState<{
    playlistUrl: string;
  } | null>(null);

  async function handleSave() {
    setError(null);
    setLoading(true);

    try {
      const result = await savePlaylist({
        generationId,
        includedTrackUris: includedUris,
        playlistName: playlistName.trim() || undefined,
      });
      setSuccess({ playlistUrl: result.playlistUrl });
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
          : "Failed to save playlist. Please try again.";

      setError({ message, correlationId });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="save-playlist-form">
        <div className="save-playlist-form__success">
          <span>Playlist saved!</span>
          <a
            href={success.playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Spotify ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="save-playlist-form">
      <input
        className="save-playlist-form__input"
        type="text"
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        placeholder={getDefaultPlaylistName()}
        aria-label="Playlist name (optional)"
      />

      {error && (
        <ErrorBanner message={error.message} correlationId={error.correlationId} />
      )}

      <Button
        onClick={handleSave}
        loading={loading}
        disabled={includedUris.length === 0}
      >
        Save to Spotify
      </Button>
    </div>
  );
}
