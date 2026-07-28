import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { ResolvedTrack, GenerationResult } from "../generator/generatorApi";

export interface TrackUIState {
  track: ResolvedTrack;
  included: boolean;
}

interface TrackSelectionState {
  tracks: TrackUIState[];
  generationResult: GenerationResult | null;
  setGenerationResult: (result: GenerationResult) => void;
  initTracks: (resolvedTracks: ResolvedTrack[]) => void;
  toggleTrack: (trackId: string) => void;
}

export const useTrackSelectionStore = create<TrackSelectionState>((set) => ({
  tracks: [],
  generationResult: null,

  setGenerationResult: (result) => {
    set({
      generationResult: result,
      tracks: result.tracks.map((track) => ({ track, included: true })),
    });
  },

  initTracks: (resolvedTracks) => {
    set({
      tracks: resolvedTracks.map((track) => ({ track, included: true })),
    });
  },

  toggleTrack: (trackId) => {
    set((state) => ({
      tracks: state.tracks.map((item) =>
        item.track.trackId === trackId
          ? { ...item, included: !item.included }
          : item,
      ),
    }));
  },
}));

/** Derived selector: number of included tracks (returns a primitive — safe) */
export function selectIncludedCount(state: TrackSelectionState): number {
  return state.tracks.filter((t) => t.included).length;
}

/**
 * Hook that returns included URIs with shallow equality comparison.
 * This prevents infinite re-renders from new array references.
 */
export function useIncludedUris(): string[] {
  return useTrackSelectionStore(
    useShallow((state) =>
      state.tracks.filter((t) => t.included).map((t) => t.track.spotifyUri),
    ),
  );
}
