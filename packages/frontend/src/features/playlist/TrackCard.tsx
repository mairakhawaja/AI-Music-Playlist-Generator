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
  return (
    <div
      className={`track-card ${included ? "" : "track-card--excluded"}`.trim()}
      style={style}
    >
      <img
        className="track-card__art"
        src={track.albumArtUrl}
        alt={`${track.albumName} album art`}
        width={72}
        height={72}
      />

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
          Open in Spotify ↗
        </a>
      </div>

      <div className="track-card__toggle">
        <TrackToggle included={included} onToggle={onToggle} trackTitle={track.title} />
      </div>
    </div>
  );
}
