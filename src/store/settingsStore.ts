import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const VALID_MODELS = [
  "anthropic/claude-3.7-sonnet:beta",
  "deepseek/deepseek-r1-distill-llama-70b",
  "deepseek/deepseek-r1",
  "google/gemma-3-27b-it",
] as const;

export interface UserSettings {
  model: (typeof VALID_MODELS)[number];
  openaiKey: string;
  openrouterKey: string;
  anthropicKey: string;
  gigaverseToken: string;
}

interface SettingsState extends UserSettings {
  setModel: (model: (typeof VALID_MODELS)[number]) => void;
  setOpenAIKey: (key: string) => void;
  setOpenRouterKey: (key: string) => void;
  setAnthropicKey: (key: string) => void;
  setGigaverseToken: (token: string) => void;
  setApiKey: (key: keyof UserSettings, value: string) => void;
  clearSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  model: "anthropic/claude-3.7-sonnet:beta",
  openaiKey: "",
  openrouterKey: "",
  anthropicKey: "",
  gigaverseToken: "",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setModel: (model) => set({ model }),
      setOpenAIKey: (openaiKey) => set({ openaiKey }),
      setOpenRouterKey: (openrouterKey) => set({ openrouterKey }),
      setAnthropicKey: (anthropicKey) => set({ anthropicKey }),
      setGigaverseToken: (gigaverseToken) => set({ gigaverseToken }),

      setApiKey: (key, value) => {
        if (key === "model") {
          // Validate that the value is one of the allowed model types
          if (VALID_MODELS.includes(value as any)) {
            set({ model: value as (typeof VALID_MODELS)[number] });
          } else {
            console.error(`Invalid model type: ${value}`);
          }
        } else {
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
  if (settings.openaiKey !== undefined) store.setOpenAIKey(settings.openaiKey);
  if (settings.openrouterKey !== undefined)
    store.setOpenRouterKey(settings.openrouterKey);
  if (settings.anthropicKey !== undefined)
    store.setAnthropicKey(settings.anthropicKey);
  if (settings.gigaverseToken !== undefined)
    store.setGigaverseToken(settings.gigaverseToken);
}

export function clearUserSettings(): void {
  useSettingsStore.getState().clearSettings();
}

export function getApiKey(key: keyof UserSettings): string {
  const settings = getUserSettings();
  return settings ? settings[key] : "";
}

/**
 * Check if a specific API key or token is set
 * @param key The key to check ('openaiKey', 'openrouterKey', 'anthropicKey', or 'gigaverseToken')
 * @returns True if the key exists and is not empty
 */
export function hasApiKey(key: keyof UserSettings): boolean {
  const value = getApiKey(key);
  return value !== undefined && value !== "";
}

export function setApiKey(key: keyof UserSettings, value: string): void {
  useSettingsStore.getState().setApiKey(key, value);
}
