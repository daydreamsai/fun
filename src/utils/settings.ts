/**
 * Settings utility functions for managing API keys and tokens
 */

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

const SETTINGS_KEY = "userSettings";

/**
 * Get all user settings from localStorage
 * @returns UserSettings object or null if no settings are found
 */
export function getUserSettings(): UserSettings | null {
  const savedSettings = localStorage.getItem(SETTINGS_KEY);
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings) as UserSettings;
    } catch (error) {
      console.error("Failed to parse user settings:", error);
      return null;
    }
  }
  return null;
}

/**
 * Save user settings to localStorage
 * @param settings UserSettings object to save
 */
export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Clear all user settings from localStorage
 */
export function clearUserSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

/**
 * Get a specific API key or token
 * @param key The key to retrieve ('openaiKey', 'openrouterKey', 'anthropicKey', or 'gigaverseToken')
 * @returns The requested key/token or empty string if not found
 */
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

/**
 * Set a specific API key or token
 * @param key The key to set ('model', 'openaiKey', 'openrouterKey', 'anthropicKey', or 'gigaverseToken')
 * @param value The value to set
 */
export function setApiKey(key: keyof UserSettings, value: string): void {
  const settings = getUserSettings() || {
    model: "anthropic/claude-3.7-sonnet:beta" as const,
    openaiKey: "",
    openrouterKey: "",
    anthropicKey: "",
    gigaverseToken: "",
  };

  if (key === "model") {
    // Validate that the value is one of the allowed model types
    if (VALID_MODELS.includes(value as (typeof VALID_MODELS)[number])) {
      (settings[key] as string) = value;
    } else {
      console.error(`Invalid model type: ${value}`);
      return;
    }
  } else {
    settings[key] = value;
  }

  saveUserSettings(settings);
}
