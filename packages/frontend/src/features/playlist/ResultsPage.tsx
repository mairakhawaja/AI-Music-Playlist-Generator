import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PillBadge } from "../../components/ui";
import { TrackCard } from "./TrackCard";
import { IncludedCount } from "./IncludedCount";
import { SavePlaylistForm } from "./SavePlaylistForm";
import { useTrackSelectionStore } from "./trackSelectionStore";
import "./ResultsPage.css";

export function ResultsPage() {
  const navigate = useNavigate();
  const generationResult = useTrackSelectionStore((s) => s.generationResult);
  const tracks = useTrackSelectionStore((s) => s.tracks);
  const toggleTrack = useTrackSelectionStore((s) => s.toggleTrack);

  useEffect(() => {
    if (!generationResult) {
      navigate("/generate", { replace: true });
    }
  }, [generationResult, navigate]);

  if (!generationResult || tracks.length === 0) {
    return null;
  }

  return (
    <div className="results-page">
      <header className="results-page__header">
        <h1 className="results-page__title">Your Recommendations</h1>
        <div className="results-page__badges">
          <IncludedCount />
          {generationResult.partialWarning && (
            <PillBadge label="Partial results" className="results-page__partial-warning" />
          )}
        </div>
      </header>

      <div className="results-page__tracks">
        {tracks.map((item, index) => (
          <div
            key={item.track.trackId}
            className="results-page__track-enter"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TrackCard
              track={item.track}
              included={item.included}
              onToggle={() => toggleTrack(item.track.trackId)}
            />
          </div>
        ))}
      </div>

      <SavePlaylistForm generationId={generationResult.generationId} />
    </div>
  );
}
