import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const VALID_MODELS = [
  "google/gemini-2.5-flash-lite",
  "qwen/qwen3-235b-a22b",
  "gpt-4o",
  "claude-3-5-sonnet-latest",
] as const;

export interface UserSettings {
  model: (typeof VALID_MODELS)[number];
  x402WalletKey: string;
  x402Amount: string; // Amount in USDC (e.g., "100000" = $0.10)
  x402Network: 'base-sepolia' | 'base';
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
  setX402WalletKey: (key: string) => void;
  setX402Amount: (amount: string) => void;
  setX402Network: (network: 'base-sepolia' | 'base') => void;
  setGigaverseToken: (token: string) => void;
  setAbstractAddress: (address: string) => void;
  setShowThoughtMessages: (show: boolean) => void;
  setShowSystemMessages: (show: boolean) => void;
  setShowHelpWindow: (show: boolean) => void;
  setApiKey: (key: keyof UserSettings, value: string | boolean) => void;
  clearSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  model: "google/gemini-2.5-flash-lite",
  x402WalletKey: "",
  x402Amount: "100000", // Default $0.10 USDC per request
  x402Network: "base-sepolia",
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
      setX402WalletKey: (x402WalletKey) => set({ x402WalletKey }),
      setX402Amount: (x402Amount) => set({ x402Amount }),
      setX402Network: (x402Network) => set({ x402Network }),
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
  if (settings.x402WalletKey !== undefined)
    store.setX402WalletKey(settings.x402WalletKey);
  if (settings.x402Amount !== undefined)
    store.setX402Amount(settings.x402Amount);
  if (settings.x402Network !== undefined)
    store.setX402Network(settings.x402Network);
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
 * @param key The key to check ('openaiKey', 'openrouterKey', 'anthropicKey', or 'gigaverseToken')
 * @returns True if the key exists and is not empty
 */
export function hasApiKey(
  key: keyof Pick<
    UserSettings,
    "x402WalletKey" | "gigaverseToken"
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
