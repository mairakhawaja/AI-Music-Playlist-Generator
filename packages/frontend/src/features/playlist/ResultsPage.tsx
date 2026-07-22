import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { GenerationResult } from "../generator/generatorApi";
import { PillBadge } from "../../components/ui";
import { TrackCard } from "./TrackCard";
import { IncludedCount } from "./IncludedCount";
import { SavePlaylistForm } from "./SavePlaylistForm";
import { useTrackSelectionStore } from "./trackSelectionStore";
import "./ResultsPage.css";

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state as GenerationResult | undefined;

  const initTracks = useTrackSelectionStore((s) => s.initTracks);
  const tracks = useTrackSelectionStore((s) => s.tracks);
  const toggleTrack = useTrackSelectionStore((s) => s.toggleTrack);

  useEffect(() => {
    if (!result) {
      navigate("/generate", { replace: true });
      return;
    }
    initTracks(result.tracks);
  }, [result, initTracks, navigate]);

  if (!result) {
    return null;
  }

  return (
    <div className="results-page">
      <header className="results-page__header">
        <h1 className="results-page__title">Your Recommendations</h1>
        <div className="results-page__badges">
          <IncludedCount />
          {result.partialWarning && (
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

      <SavePlaylistForm generationId={result.generationId} />
    </div>
  );
}
