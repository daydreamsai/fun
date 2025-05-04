import { createAgent } from "@/agent";
import { create } from "zustand";
import { AnyAgent } from "@daydreamsai/core";
import { useSettingsStore } from "@/store/settingsStore";

interface AgentState {
  agent: AnyAgent;
  recreateAgent: () => void;
}

export const useAgentStore = create<AgentState>((set) => {
  // Initial agent creation
  const agent = createAgent();

  // Initialize the agent immediately
  if (typeof window !== "undefined") {
    // Only run in browser environment
    agent.start().catch((error) => {
      console.error("Failed to initialize agent:", error);
    });
  }

  // Function to recreate the agent with fresh settings
  const recreateAgent = async () => {
    const newAgent = createAgent();
    // Initialize the new agent before setting it
    if (typeof window !== "undefined") {
      try {
        await newAgent.start();
      } catch (error) {
        console.error("Failed to initialize new agent:", error);
      }
    }
    set({ agent: newAgent });
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

  return {
    agent,
    recreateAgent,
  };
});
