import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      fontSize: 14,
      wordWrap: 'off',
      minimapEnabled: false,
      theme: 'dark',
      tabSize: 2,
      lineNumbers: 'on',
      autoSave: true,
      setFontSize: (v) => set({ fontSize: v }),
      setWordWrap: (v) => set({ wordWrap: v }),
      setMinimapEnabled: (v) => set({ minimapEnabled: v }),
      setTheme: (v) => set({ theme: v }),
      setTabSize: (v) => set({ tabSize: v }),
      setLineNumbers: (v) => set({ lineNumbers: v }),
      setAutoSave: (v) => set({ autoSave: v }),
    }),
    {
      name: 'devorbit-settings',
    }
  )
);
