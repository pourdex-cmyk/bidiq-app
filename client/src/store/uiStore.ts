import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  globalSearchOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  toggleGlobalSearch: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      globalSearchOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      openGlobalSearch: () => set({ globalSearchOpen: true }),
      closeGlobalSearch: () => set({ globalSearchOpen: false }),
      toggleGlobalSearch: () => set((s) => ({ globalSearchOpen: !s.globalSearchOpen })),
    }),
    { name: 'bidiq-ui', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) }
  )
);
