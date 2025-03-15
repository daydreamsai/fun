import {
  type MemoryStore,
  createContainer,
  createDreams,
  createMemory,
  createMemoryStore,
  createVectorStore,
} from "@daydreamsai/core";
import { chat } from "./chat";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { tavily } from "@tavily/core";

import { giga, goalContexts } from "./giga";
import { getUserSettings } from "@/utils/settings";

export const anthropic = createAnthropic({
  apiKey:
    getUserSettings()?.anthropicKey || import.meta.env.VITE_ANTHROPIC_API_KEY,
  headers: {
    "anthropic-dangerous-direct-browser-access": "true",
  },
});

export const openai = createOpenAI({
  apiKey: getUserSettings()?.openaiKey || import.meta.env.VITE_OPENAI_API_KEY,
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
  const container = createContainer();

  container.singleton("tavily", () =>
    tavily({
      apiKey: import.meta.env.VITE_TAVILY_API_KEY,
    })
  );

  return createDreams({
    model: anthropic("claude-3-7-sonnet-latest"),
    context: goalContexts,
    container,
    memory: createMemory(
      memoryStorage,
      createVectorStore(),
      openai("gpt-4-turbo")
    ),
    extensions: [chat, giga],
  });
}
