import { create } from "zustand";
import type { ResolvedTrack } from "../generator/generatorApi";

export interface TrackUIState {
  track: ResolvedTrack;
  included: boolean;
}

interface TrackSelectionState {
  tracks: TrackUIState[];
  initTracks: (resolvedTracks: ResolvedTrack[]) => void;
  toggleTrack: (trackId: string) => void;
}

export const useTrackSelectionStore = create<TrackSelectionState>((set) => ({
  tracks: [],

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

/** Derived selector: number of included tracks */
export function selectIncludedCount(state: TrackSelectionState): number {
  return state.tracks.filter((t) => t.included).length;
}

/** Derived selector: URIs of included tracks */
export function selectIncludedUris(state: TrackSelectionState): string[] {
  return state.tracks
    .filter((t) => t.included)
    .map((t) => t.track.spotifyUri);
}
