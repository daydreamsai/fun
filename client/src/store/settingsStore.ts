import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const VALID_MODELS = [
  "google-vertex/gemini-2.5-flash-lite",
] as const;

export interface UserSettings {
  model: (typeof VALID_MODELS)[number];
  dreamsRouterApiKey: string;
  // TODO: Add fallback to OpenRouter if needed - user wants to remove this later
  openRouterKey?: string; 
  gigaverseToken: string;
  abstractAddress: string;
  showThoughtMessages: boolean;
  showSystemMessages: boolean;
  showHelpWindow: boolean;
  maxSteps?: number;
  maxWorkingMemorySize?: number;
}

interface SettingsState extends UserSettings {
  setModel: (model: (typeof VALID_MODELS)[number]) => void;
  setDreamsRouterApiKey: (key: string) => void;
  setOpenRouterKey: (key: string) => void;
  setGigaverseToken: (token: string) => void;
  setAbstractAddress: (address: string) => void;
  setShowThoughtMessages: (show: boolean) => void;
  setShowSystemMessages: (show: boolean) => void;
  setShowHelpWindow: (show: boolean) => void;
  setApiKey: (key: keyof UserSettings, value: string | boolean) => void;
  clearSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  model: "google-vertex/gemini-2.5-flash-lite",
  dreamsRouterApiKey: "",
  openRouterKey: "",
  gigaverseToken: "",
  abstractAddress: "",
  showThoughtMessages: true,
  showSystemMessages: true,
  showHelpWindow: true,
  maxSteps: 100,
  maxWorkingMemorySize: 20,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setModel: (model) => set({ model }),
      setDreamsRouterApiKey: (dreamsRouterApiKey) => set({ dreamsRouterApiKey }),
      setOpenRouterKey: (openRouterKey) => set({ openRouterKey }),
      setGigaverseToken: (gigaverseToken) => set({ gigaverseToken }),
      setAbstractAddress: (abstractAddress) => set({ abstractAddress }),
      setShowThoughtMessages: (showThoughtMessages) =>
        set({ showThoughtMessages }),
      setShowSystemMessages: (showSystemMessages) =>
        set({ showSystemMessages }),
      setShowHelpWindow: (showHelpWindow) => set({ showHelpWindow }),

      setApiKey: (key, value) => {
        if (key === "model" && typeof value === "string") {
          // Validate that the value is one of the allowed model types
          if (VALID_MODELS.includes(value as any)) {
            set({ model: value as (typeof VALID_MODELS)[number] });
          } else {
            console.error(`Invalid model type: ${value}`);
          }
        } else if (
          key === "showThoughtMessages" &&
          typeof value === "boolean"
        ) {
          set({ showThoughtMessages: value });
        } else if (key === "showSystemMessages" && typeof value === "boolean") {
          set({ showSystemMessages: value });
        } else if (key === "showHelpWindow" && typeof value === "boolean") {
          set({ showHelpWindow: value });
        } else if (typeof value === "string") {
          set({ [key]: value });
        }
      },

      clearSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "user-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper functions to maintain backward compatibility
export function getUserSettings(): UserSettings {
  return useSettingsStore.getState();
}

export function saveUserSettings(settings: UserSettings): void {
  const store = useSettingsStore.getState();

  if (settings.model) store.setModel(settings.model);
  if (settings.dreamsRouterApiKey !== undefined)
    store.setDreamsRouterApiKey(settings.dreamsRouterApiKey);
  if (settings.openRouterKey !== undefined)
    store.setOpenRouterKey(settings.openRouterKey);
  if (settings.gigaverseToken !== undefined)
    store.setGigaverseToken(settings.gigaverseToken);
  if (settings.showThoughtMessages !== undefined)
    store.setShowThoughtMessages(settings.showThoughtMessages);
  if (settings.showSystemMessages !== undefined)
    store.setShowSystemMessages(settings.showSystemMessages);
  if (settings.showHelpWindow !== undefined)
    store.setShowHelpWindow(settings.showHelpWindow);
}

export function clearUserSettings(): void {
  useSettingsStore.getState().clearSettings();
}

/**
 * Get the value of a specific setting
 */
export function getApiKey(key: keyof UserSettings) {
  const settings = getUserSettings();
  return settings ? settings[key] : "";
}

/**
 * Check if a specific API key or token is set
 * @param key The key to check ('dreamsRouterApiKey', 'openRouterKey', or 'gigaverseToken')
 * @returns True if the key exists and is not empty
 */
export function hasApiKey(
  key: keyof Pick<
    UserSettings,
    "dreamsRouterApiKey" | "openRouterKey" | "gigaverseToken"
  >
): boolean {
  const value = getApiKey(key);
  return value !== undefined && value !== "";
}

export function setApiKey(
  key: keyof UserSettings,
  value: string | boolean
): void {
  const store = useSettingsStore.getState();
  if (
    typeof value === "boolean" &&
    (key === "showThoughtMessages" ||
      key === "showSystemMessages" ||
      key === "showHelpWindow")
  ) {
    if (key === "showThoughtMessages") {
      store.setShowThoughtMessages(value);
    } else if (key === "showSystemMessages") {
      store.setShowSystemMessages(value);
    } else if (key === "showHelpWindow") {
      store.setShowHelpWindow(value);
    }
  } else if (typeof value === "string") {
    store.setApiKey(key, value);
  }
}
