import { create } from 'zustand';

export interface ProctoringConfig {
  maxFaceWarnings: number;
  maxTabWarnings: number;
  detectionIntervalMs: number;
  screenshotIntervalMs: number;
  enableScreenRecording: boolean;
  enableCopyPasteDetection: boolean;
  enableAudioMonitoring: boolean;
  enableBrowserLockdown: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  defaultExpiryDays: number;
  defaultTemplateId: string;
  proctoring: ProctoringConfig;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultExpiryDays: 5,
  defaultTemplateId: 'a0000000-0000-0000-0000-000000000001',
  proctoring: {
    maxFaceWarnings: 3,
    maxTabWarnings: 2,
    detectionIntervalMs: 3000,
    screenshotIntervalMs: 30000,
    enableScreenRecording: false,
    enableCopyPasteDetection: true,
    enableAudioMonitoring: true,
    enableBrowserLockdown: false,
  },
};

interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateProctoring: (partial: Partial<ProctoringConfig>) => void;
  resetSettings: () => void;
}

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('securecode_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed, proctoring: { ...DEFAULT_SETTINGS.proctoring, ...parsed.proctoring } };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: loadSettings(),
  updateSettings: (partial) =>
    set((state) => {
      const newSettings = { ...state.settings, ...partial };
      localStorage.setItem('securecode_settings', JSON.stringify(newSettings));
      return { settings: newSettings };
    }),
  updateProctoring: (partial) =>
    set((state) => {
      const newSettings = {
        ...state.settings,
        proctoring: { ...state.settings.proctoring, ...partial },
      };
      localStorage.setItem('securecode_settings', JSON.stringify(newSettings));
      return { settings: newSettings };
    }),
  resetSettings: () => {
    localStorage.removeItem('securecode_settings');
    set({ settings: DEFAULT_SETTINGS });
  },
}));
