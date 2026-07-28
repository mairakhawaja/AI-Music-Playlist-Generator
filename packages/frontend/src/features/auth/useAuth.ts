import { create } from "zustand";
import { getMe, login as apiLogin, logout as apiLogout } from "./authApi";
import axios from "axios";

export interface AuthState {
  spotifyUserId: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  spotifyUserId: null,
  displayName: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      const { spotifyUserId, displayName } = await getMe();
      set({
        spotifyUserId,
        displayName,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        set({
          spotifyUserId: null,
          displayName: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        set({
          spotifyUserId: null,
          displayName: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
  },

  login: async () => {
    await apiLogin();
  },

  logout: async () => {
    await apiLogout();
    localStorage.removeItem("session_token");
    set({
      spotifyUserId: null,
      displayName: null,
      isAuthenticated: false,
    });
  },
}));
