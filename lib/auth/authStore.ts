import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isAuthenticated: boolean;
  userPhone: string | null;
  userName: string | null;
  login: (phone: string, name?: string) => void;
  logout: () => void;
  updateProfile: (details: { userName?: string }) => void;
  showAuthModal: boolean;
  authSuccessAction: (() => void) | null;
  openAuthModal: (onSuccess?: () => void) => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userPhone: null,
      userName: null,
      login: (phone, name) => set({ isAuthenticated: true, userPhone: phone, userName: name || null }),
      logout: () => set({ isAuthenticated: false, userPhone: null, userName: null }),
      updateProfile: (details) => set((state) => ({ ...state, ...details })),
      showAuthModal: false,
      authSuccessAction: null,
      openAuthModal: (onSuccess) => set({ showAuthModal: true, authSuccessAction: onSuccess || null }),
      closeAuthModal: () => set({ showAuthModal: false, authSuccessAction: null }),
    }),
    { 
      name: "punchraksha-auth",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userPhone: state.userPhone,
        userName: state.userName,
      }),
    },
  ),
);
