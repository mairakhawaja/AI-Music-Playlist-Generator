import { useState } from "react";
import type { ResolvedTrack } from "../generator/generatorApi";
import { TrackToggle } from "./TrackToggle";
import "./TrackCard.css";

export interface TrackCardProps {
  track: ResolvedTrack;
  included: boolean;
  onToggle: () => void;
  style?: React.CSSProperties;
}

export function TrackCard({ track, included, onToggle, style }: TrackCardProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <div
      className={`track-card ${included ? "" : "track-card--excluded"}`.trim()}
      style={style}
    >
      <div className="track-card__art-wrapper">
        <img
          className="track-card__art"
          src={track.albumArtUrl}
          alt={`${track.albumName} album art`}
          width={72}
          height={72}
        />
        <button
          className={`track-card__play-btn ${showEmbed ? "track-card__play-btn--playing" : ""}`}
          onClick={() => setShowEmbed(!showEmbed)}
          aria-label={showEmbed ? `Hide player for ${track.title}` : `Preview ${track.title}`}
          type="button"
        >
          {showEmbed ? "✕ Close" : "▶ Preview"}
        </button>
      </div>

      <div className="track-card__info">
        <span className="track-card__title">{track.title}</span>
        <span className="track-card__artist">{track.artist}</span>
        <span className="track-card__reason">{track.reason}</span>
        <a
          className="track-card__spotify-link"
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${track.title} in Spotify`}
        >
          Open in Spotify
        </a>
      </div>

      <div className="track-card__toggle">
        <TrackToggle included={included} onToggle={onToggle} trackTitle={track.title} />
      </div>

      {showEmbed && (
        <div className="track-card__embed">
          <iframe
            src={`https://open.spotify.com/embed/track/${track.trackId}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={`Spotify player for ${track.title}`}
          />
        </div>
      )}
    </div>
  );
}
