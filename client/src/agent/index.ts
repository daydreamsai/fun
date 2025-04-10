import {
  type MemoryStore,
  createDreams,
  createMemory,
  createMemoryStore,
  createVectorStore,
} from "@daydreamsai/core";
import { chat } from "./chat";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { giga, goalContexts } from "./giga";
import { useSettingsStore } from "@/store/settingsStore";
// import { useUserStore } from "@/store/userStore";

// Get settings directly from the store

const browserStorage = (): MemoryStore => {
  const memoryStore = createMemoryStore();
  return {
    async get<T>(key: string) {
      console.log("get", key);
      let data = await memoryStore.get<T>(key);
      if (data === null) {
        const local = localStorage.getItem(key);
        if (local) {
          data = JSON.parse(local);
          await memoryStore.set(key, data);
        }
      }

      return data;
    },
    async set(key, value) {
      console.log("set", key, value);
      localStorage.setItem(key, JSON.stringify(value));
      return memoryStore.set(key, value);
    },
    async clear() {
      // localStorage.
      return memoryStore.clear();
    },
    async delete(key) {
      return memoryStore.delete(key);
    },
  };
};

export function createAgent() {
  // Always get fresh settings when creating the agent
  const settings = useSettingsStore.getState();
  // const user = useUserStore.getState();

  const memoryStorage = browserStorage();

  const openrouter = createOpenRouter({
    apiKey: settings.openrouterKey,
  });

  console.log("Creating agent with settings:", settings);

  return createDreams({
    model: openrouter(settings.model || "deepseek/deepseek-r1"),
    context: goalContexts,
    memory: createMemory(
      memoryStorage,
      createVectorStore(),
      openrouter("openai/gpt-4-turbo")
    ),
    extensions: [chat, giga],
  });
}
