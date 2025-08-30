import {
  InMemoryGraphProvider,
  InMemoryKeyValueProvider,
  InMemoryVectorProvider,
  LogLevel,
  Logger,
  MemorySystem,
  createContainer,
  createDreams,
  service,
} from "@daydreamsai/core";
import { chat } from "./chat";

import { createDreamsRouterAuth, createDreamsRouter } from "@daydreamsai/ai-sdk-provider";
import { privateKeyToAccount } from "viem/accounts";

import { useSettingsStore } from "@/store/settingsStore";
import { x402Service } from "@/services/x402Service";
import { walletJWTService } from "@/services/walletJWTService";

import { openDB, type IDBPDatabase } from "idb";
import { Cache } from "./utils/cache";

// Get settings directly from the store

// --- IndexedDB Setup ---
const DB_NAME = "agent-memory-store";
const STORE_NAME = "keyval";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise!;
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const value = await db.get(STORE_NAME, key);
  return value ? (JSON.parse(value as string) as T) : null;
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, JSON.stringify(value), key);
}

async function idbDelete(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

async function idbClear(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
// --- End IndexedDB Setup ---

interface BrowserStorage {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  clear(): Promise<void>;
  delete(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

export const browserStorage = async (): Promise<BrowserStorage> => {
  const memoryStore = new InMemoryKeyValueProvider();
  await memoryStore.initialize();

  return {
    async get<T>(key: string): Promise<T | null> {
      // 1. Try in-memory cache first
      let data = await memoryStore.get<T>(key);
      if (data !== null) {
        return data;
      }

      // 2. Try IndexedDB
      try {
        data = await idbGet<T>(key);
        if (data !== null) {
          // Cache in memory if found in IDB
          await memoryStore.set(key, data);
          return data;
        }
      } catch (error) {
        console.error(`IndexedDB get failed for key "${key}":`, error);
        // Fallback or error handling strategy if needed
      }

      // 3. Not found anywhere
      return null;
    },
    async set(key: string, value: unknown): Promise<void> {
      try {
        // 1. Set in IndexedDB
        await idbSet(key, value);
        // 2. Set in in-memory cache
        await memoryStore.set(key, value);
      } catch (error) {
        console.error(`IndexedDB set failed for key "${key}":`, error);
        // Consider if fallback to memoryStore only is acceptable
        // If IDB fails, maybe just update memoryStore?
        // await memoryStore.set(key, value); // Or re-throw depending on desired behavior
        throw error; // Re-throw for now to indicate persistence failure
      }
    },
    async clear(): Promise<void> {
      try {
        // 1. Clear IndexedDB
        await idbClear();
        // 2. Clear in-memory cache

        // await memoryStore
      } catch (error) {
        console.error("IndexedDB clear failed:", error);
        // Decide how to handle partial failure (e.g., only memory cleared)
        // await memoryStore.clear(); // Ensure memory is cleared even if IDB fails
        throw error; // Re-throw to indicate persistence layer failure
      }
    },
    async delete(key: string): Promise<boolean> {
      try {
        // 1. Delete from IndexedDB
        await idbDelete(key);
        // 2. Delete from in-memory cache
        await memoryStore.delete(key);
        return true;
      } catch (error) {
        console.error(`IndexedDB delete failed for key "${key}":`, error);
        await memoryStore.delete(key); // Ensure memory is updated even if IDB fails
        throw error; // Re-throw to indicate persistence layer failure
      }
    },
    async keys(): Promise<string[]> {
      try {
        // 1. Get keys from in-memory cache
        const memoryKeys = await memoryStore.keys();

        // 2. Get keys from IndexedDB
        const db = await getDb();
        const idbKeys = await db.getAllKeys(STORE_NAME);

        // 3. Combine and deduplicate
        const allKeys = new Set([...memoryKeys, ...(idbKeys as string[])]);
        return Array.from(allKeys);
      } catch (error) {
        console.error("Failed to retrieve keys:", error);
        // Fallback: try returning only memory keys if IDB fails
        try {
          return await memoryStore.keys();
        } catch (memError) {
          console.error(
            "Failed to retrieve memory keys after IDB failure:",
            memError
          );
          return []; // Return empty array if both fail
        }
      }
    },
  };
};

const cacheService = service({
  async boot(container) {
    const store = await container.resolve<Promise<BrowserStorage>>("memory");

    const cache: Cache = {
      async get<T>(key: string, resolve: () => Promise<T>): Promise<T> {
        const cacheKey = `cache:${key}`;
        let data = await store.get<T>(cacheKey);

        if (!data) {
          data = await resolve();
          await store.set(cacheKey, data);
        }

        return data;
      },
    };

    container.instance("cache", cache);
  },
});

const memoryMigrator = service({
  async boot(container) {
    const currentMemoryVersion = 2;
    const store = await container.resolve<Promise<BrowserStorage>>("memory");
    const version = await store.get<number>("version");

    if (version !== currentMemoryVersion) {
      await store.clear();
    }

    await store.set("version", currentMemoryVersion);
  },
});

export async function createAgent() {
  const settings = useSettingsStore.getState();
  const container = createContainer();
  const memoryStorage = browserStorage();

  container.instance("memory", memoryStorage);

  let dreamsRouter;

  try {
    // First, check if we have a JWT from a connected wallet
    const walletJWT = walletJWTService.getJWT();
    
    if (walletJWT) {
      // Use JWT authentication from connected wallet
      console.log("Using JWT authentication from connected wallet");
      
      dreamsRouter = createDreamsRouter({
        apiKey: walletJWT,
      });
      
      // Dispatch event for tracking
      window.dispatchEvent(new CustomEvent("x402_request_sent"));
    } else if (settings.x402WalletKey) {
      // Fallback to private key authentication
      console.log("Using private key authentication");
      
      await x402Service.initialize();
      const account = privateKeyToAccount(settings.x402WalletKey as `0x${string}`);
      const result = await createDreamsRouterAuth(account, {
        payments: {
          amount: settings.x402Amount,
          network: settings.x402Network,
        },
      });
      
      dreamsRouter = result.dreamsRouter;
      
      // Dispatch event for tracking
      window.dispatchEvent(new CustomEvent("x402_request_sent"));
    } else {
      // No authentication available
      throw new Error(
        "No authentication configured. Please either connect your wallet or set up a private key in settings."
      );
    }

    return createDreams({
      logger: new Logger({ level: LogLevel.INFO }),
      container,
      model: dreamsRouter(settings.model),
      modelSettings: {
        temperature: 0,
      },
      memory: new MemorySystem({
        providers: {
          kv: new InMemoryKeyValueProvider(),
          vector: new InMemoryVectorProvider(),
          graph: new InMemoryGraphProvider(),
        },
        logger: new Logger({ level: LogLevel.INFO }),
      }),
      extensions: [chat],
      services: [memoryMigrator, cacheService],
    });
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Failed to initialize AI agent. Please check your authentication configuration."
    );
  }
}
