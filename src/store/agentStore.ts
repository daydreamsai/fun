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

  // Function to recreate the agent with fresh settings
  const recreateAgent = () => {
    const newAgent = createAgent();
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
