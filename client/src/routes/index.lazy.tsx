import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInitializedAgent } from "@/hooks/agent";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  const {
    agent,
    isLoading: agentLoading,
    error: agentError,
    isInitialized,
  } = useInitializedAgent();

  // Debug logging
  useEffect(() => {
    console.log("Index component - Agent state:", {
      hasAgent: !!agent,
      isInitialized,
      agentLoading,
      agentError: agentError?.message,
    });
  }, [agent, isInitialized, agentLoading, agentError]);

  // Use react-query for fetching chats
  const {
    data: chats = [],
    isLoading: chatsLoading,
    error: chatsError,
  } = useQuery({
    queryKey: ["contexts", "gigaverse"],
    queryFn: async () => {
      console.log("Fetching contexts...");
      if (!agent) {
        console.log("No agent available for fetching contexts");
        return [];
      }
      try {
        const contexts = await agent.getContexts();
        console.log("Got contexts:", contexts);
        const filtered = contexts.filter((ctx) => ctx.type === "gigaverse");
        console.log("Filtered gigaverse contexts:", filtered);
        return filtered;
      } catch (error) {
        console.error("Error fetching contexts:", error);
        throw error; // Re-throw to let react-query handle retries
      }
    },
    enabled: !!agent && isInitialized, // Only run query when agent is available and initialized
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Disable for debugging
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Debug query state
  useEffect(() => {
    if (chatsError) {
      console.error("Query error:", chatsError);
    }
  }, [chatsError]);

  if (agentError) {
    return (
      <div className="p-4">
        <p className="text-red-500">
          Error initializing agent: {agentError.message}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Please check your settings and refresh the page.
        </p>
      </div>
    );
  }

  if (agentLoading || chatsLoading) {
    return <div className="p-4">Loading game sessions...</div>;
  }

  return (
    <div className="overflow-y-scroll">
      <div className="p-6 w-full mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8 mt-8">
          <h1 className="text-3xl font-bold">
            <p className="text-muted-foreground mt-2 font-normal">
              agentic-automation for your web3 games
            </p>
          </h1>
        </div>
        {/* Gigaverse Section */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chats?.length > 0 ? (
              chats.map((chat: any) => (
                <div key={chat.key}>
                  <Link
                    to="/games/gigaverse/$chatId"
                    params={{ chatId: chat.key }}
                    className="block bg-background border border-primary/20 hover:border-primary transition-colors overflow-hidden shadow-sm"
                  >
                    {/* Image space */}
                    <div className="h-48 relative overflow-hidden">
                      <img
                        src="/giga.jpeg"
                        alt="Game Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-xl mb-1">{chat.key}</h3>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 border">
                <h3 className="text-xl font-medium mb-2">
                  No game sessions yet
                </h3>
                <p className="mb-6">Start your first Gigaverse adventure!</p>
                <div>
                  <Button asChild variant="outline">
                    <Link
                      to="/games/gigaverse/$chatId"
                      params={{ chatId: `gigaverse-1` }}
                    >
                      <PlusCircle size={20} className="mr-2" />
                      <span>Start New Game</span>
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
