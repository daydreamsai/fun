import { createAgent } from "@/agent";
import { create } from "zustand";
import { AnyAgent } from "@daydreamsai/core";
import { useSettingsStore } from "@/store/settingsStore";
import { logger } from "@/utils/logger";

interface AgentState {
  agent: AnyAgent;
  isInitialized: boolean;
  initializationPromise: Promise<void> | null;
  initializeAgent: () => Promise<void>;
  recreateAgent: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => {
  // Initial agent creation
  const agent = createAgent();
  let initPromise: Promise<void> | null = null;

  // Initialize function that can be called multiple times safely
  const initializeAgent = async () => {
    const state = get();

    // If already initialized, return immediately
    if (state.isInitialized) {
      return;
    }

    // If initialization is in progress, return the existing promise
    if (state.initializationPromise) {
      return state.initializationPromise;
    }

    // Create new initialization promise
    initPromise = (async () => {
      try {
        await agent.start();

        // Give services time to fully initialize (particularly IndexedDB)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify the agent is working by trying to get contexts
        try {
          await agent.getContexts();
        } catch (verifyError) {
          console.warn("Agent verification failed, retrying...", verifyError);
          // Give it a bit more time
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Try once more
          await agent.getContexts();
        }

        set({ isInitialized: true });
        logger.info("Agent initialized and verified");
      } catch (error) {
        console.error("Failed to initialize agent:", error);
        // Reset initialization promise on error so it can be retried
        set({ initializationPromise: null });
        throw error;
      }
    })();

    // Store the promise immediately
    set({ initializationPromise: initPromise });

    return initPromise;
  };

  // Function to recreate the agent with fresh settings
  const recreateAgent = async () => {
    const newAgent = createAgent();

    // Reset initialization state
    set({
      agent: newAgent,
      isInitialized: false,
      initializationPromise: null,
    });

    // Initialize the new agent
    try {
      const newInitPromise = (async () => {
        await newAgent.start();

        // Give services time to fully initialize
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify the agent is working
        try {
          await newAgent.getContexts();
        } catch (verifyError) {
          console.warn(
            "New agent verification failed, retrying...",
            verifyError
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
          await newAgent.getContexts();
        }
      })();

      set({ initializationPromise: newInitPromise });
      await newInitPromise;
      set({ isInitialized: true });
      logger.info("New agent initialized and verified");
    } catch (error) {
      console.error("Failed to initialize new agent:", error);
      set({ initializationPromise: null });
      throw error;
    }
  };

  // Subscribe to settings changes
  const unsubscribe = useSettingsStore.subscribe((state, prevState) => {
    // Only recreate if relevant settings changed
    const relevantSettingsChanged =
      state.model !== prevState.model ||
      state.openrouterKey !== prevState.openrouterKey ||
      state.gigaverseToken !== prevState.gigaverseToken;

    if (relevantSettingsChanged) {
      recreateAgent();
    }
  });

  // Clean up subscription when store is destroyed
  // This is important to prevent memory leaks
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", unsubscribe);
  }

  // Start initialization immediately in browser environment
  if (typeof window !== "undefined") {
    // Use setTimeout to avoid calling set during store creation
    setTimeout(() => {
      initializeAgent();
    }, 0);
  }

  return {
    agent,
    isInitialized: false,
    initializationPromise: null,
    initializeAgent,
    recreateAgent,
  };
});
