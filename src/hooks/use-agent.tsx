import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createAgent } from "@/agent";
import { useSettingsStore } from "@/store/settingsStore";

export function useAgent() {
  // Get the initial agent from the router context
  const context = useRouteContext({ from: "__root__" });
  const initialAgent = context.agent;

  // Create a state to hold the current agent
  const [agent, setAgent] = useState(initialAgent);

  // Get the settings store
  const settings = useSettingsStore();

  // Subscribe to settings changes and recreate the agent when they change
  useEffect(() => {
    // Create a subscription to the settings store
    const unsubscribe = useSettingsStore.subscribe((state, prevState) => {
      // Only recreate the agent if relevant settings have changed
      if (
        state.openrouterKey !== prevState.openrouterKey ||
        state.gigaverseToken !== prevState.gigaverseToken ||
        state.model !== prevState.model
      ) {
        console.log("Settings changed, recreating agent");
        const newAgent = createAgent();
        setAgent(newAgent);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return agent;
}
