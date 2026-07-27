import "./TrackToggle.css";

export interface TrackToggleProps {
  included: boolean;
  onToggle: () => void;
  trackTitle: string;
}

export function TrackToggle({ included, onToggle, trackTitle }: TrackToggleProps) {
  return (
    <button
      type="button"
      className={`track-toggle ${included ? "" : "track-toggle--excluded"}`.trim()}
      onClick={onToggle}
      aria-label={included ? `Exclude ${trackTitle}` : `Include ${trackTitle}`}
      aria-pressed={included}
    >
      {included ? "✓" : "✕"}
    </button>
  );
}
