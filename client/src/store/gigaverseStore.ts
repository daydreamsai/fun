import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DungeonConfig {
  type: "dungeon";
  numberOfRuns: number;
  runType: "classic" | "juiced";
  selectedDungeon: string | null;
  selectedDungeonId: number | null;
  useConsumables: boolean;
  lootStrategy: "Balanced" | "Glass Canon" | "Tank" | "Two Move Specialist";
}

interface FishingConfig {
  type: "fishing";
  fishingSize: "small" | "normal" | "big" | null;
  numberOfRuns: number;
  consumables: string[];
}

type GameConfig = DungeonConfig | FishingConfig;

interface GigaverseStore {
  gameMode: "dungeon" | "fishing";
  config: GameConfig;
  setGameMode: (mode: "dungeon" | "fishing") => void;
  setConfig: (config: GameConfig) => void;
  updateConfig: (updates: Partial<GameConfig>) => void;
}

export const useGigaverseStore = create<GigaverseStore>()(
  persist(
    (set) => ({
      gameMode: "dungeon",
      config: {
        type: "dungeon",
        numberOfRuns: 1,
        runType: "classic",
        selectedDungeon: null,
        selectedDungeonId: null,
        useConsumables: false,
        lootStrategy: "Balanced",
      },
      setGameMode: (mode) =>
        set((state) => {
          // Only reset config if actually changing modes
          if (state.gameMode === mode) {
            return state;
          }
          const newConfig: GameConfig =
            mode === "dungeon"
              ? {
                  type: "dungeon",
                  numberOfRuns: 1,
                  runType: "classic",
                  selectedDungeon: null,
                  selectedDungeonId: null,
                  useConsumables: false,
                  lootStrategy: "Balanced",
                }
              : {
                  type: "fishing",
                  fishingSize: null,
                  numberOfRuns: 0,
                  consumables: [],
                };
          return { gameMode: mode, config: newConfig };
        }),
      setConfig: (config) => set({ config }),
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
    }),
    {
      name: "gigaverse-game-config",
      partialize: (state) => ({
        gameMode: state.gameMode,
        config: state.config,
      }),
    }
  )
);