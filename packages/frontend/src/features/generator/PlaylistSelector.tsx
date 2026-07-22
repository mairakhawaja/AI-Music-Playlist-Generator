import { useEffect, useState } from "react";
import { Card } from "../../components/ui";
import { getPlaylists, type SpotifyPlaylist } from "./generatorApi";
import "./PlaylistSelector.css";

export interface PlaylistSelectorProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function PlaylistSelector({
  selectedIds,
  onToggle,
}: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlaylists() {
      try {
        const data = await getPlaylists();
        if (!cancelled) {
          setPlaylists(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load playlists.");
          setLoading(false);
        }
      }
    }

    fetchPlaylists();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="playlist-selector playlist-selector--loading">
        <p>Loading playlists…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playlist-selector playlist-selector--error">
        <p>{error}</p>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="playlist-selector playlist-selector--empty">
        <p>No playlists found.</p>
      </div>
    );
  }

  return (
    <div className="playlist-selector">
      <div className="playlist-selector__grid">
        {playlists.map((playlist) => {
          const isSelected = selectedIds.includes(playlist.id);
          return (
            <Card
              key={playlist.id}
              className={`playlist-selector__card ${isSelected ? "playlist-selector__card--selected" : ""}`}
              onClick={() => onToggle(playlist.id)}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(playlist.id);
                }
              }}
            >
              <div className="playlist-selector__image-wrapper">
                {playlist.coverImageUrl ? (
                  <img
                    className="playlist-selector__cover"
                    src={playlist.coverImageUrl}
                    alt={`${playlist.name} cover`}
                  />
                ) : (
                  <div className="playlist-selector__cover-placeholder" />
                )}
              </div>
              <div className="playlist-selector__info">
                <span className="playlist-selector__name">
                  {playlist.name}
                </span>
                <span className="playlist-selector__track-count">
                  {playlist.trackCount} tracks
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
