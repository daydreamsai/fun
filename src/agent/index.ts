import {
  type MemoryStore,
  createDreams,
  createMemory,
  createMemoryStore,
  createVectorStore,
} from "@daydreamsai/core";
import { chat } from "./chat";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

import { giga, goalContexts } from "./giga";
import { getUserSettings } from "@/utils/settings";

console.log(getUserSettings());

export const anthropic = createAnthropic({
  apiKey: getUserSettings()?.anthropicKey,
  headers: {
    "anthropic-dangerous-direct-browser-access": "true",
  },
});

export const openai = createOpenAI({
  apiKey: getUserSettings()?.openaiKey,
});

const browserStorage = (): MemoryStore => {
  const memoryStore = createMemoryStore();
  return {
    async get<T>(key: string) {
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
  const memoryStorage = browserStorage();

  return createDreams({
    model: anthropic("claude-3-7-sonnet-latest"),
    context: goalContexts,
    memory: createMemory(
      memoryStorage,
      createVectorStore(),
      openai("gpt-4-turbo")
    ),
    extensions: [chat, giga],
  });
}
