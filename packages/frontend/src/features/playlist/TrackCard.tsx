import { useRef, useState, useEffect } from "react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Stop playback if component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function handlePlayPause() {
    if (!track.previewUrl) return;

    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // Stop any other audio playing on the page
      document.querySelectorAll("audio").forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });

      if (!audioRef.current) {
        audioRef.current = new Audio(track.previewUrl);
        audioRef.current.addEventListener("ended", () => setPlaying(false));
      }
      audioRef.current.play();
      setPlaying(true);
    }
  }

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
        {track.previewUrl && (
          <button
            className={`track-card__play-btn ${playing ? "track-card__play-btn--playing" : ""}`}
            onClick={handlePlayPause}
            aria-label={playing ? `Pause ${track.title}` : `Play preview of ${track.title}`}
            type="button"
          >
            {playing ? "⏸" : "▶"}
          </button>
        )}
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
    </div>
  );
}
