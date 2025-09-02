import {
  AnyContext,
  AnyRef,
  ContextRef,
  getWorkingMemoryAllLogs,
  InferSchemaArguments,
  AnyAction,
  AnyAgent,
} from "@daydreamsai/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { useAgentStore } from "../store/agentStore";
import { logger } from "@/utils/logger";

export function useContextState<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent | null;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const contextId = agent?.getContextId(ref) || null;
  return useQuery({
    queryKey: ["context", contextId],
    queryFn: async () => {
      if (!agent) throw new Error("Agent not available");
      return await agent.getContext(ref);
    },
    enabled: !!agent,
    retry(_failureCount, error) {
      logger.error("Context query failed", error);
      return false;
    },
    throwOnError: false,
  });
}

export function useWorkingMemory<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent | null;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const contextId = agent?.getContextId(ref) || null;
  return useQuery({
    queryKey: ["workingMemory", contextId],
    queryFn: async () => {
      if (!agent || !contextId) throw new Error("Agent not available");
      return structuredClone(
        getWorkingMemoryAllLogs(await agent.getWorkingMemory(contextId))
      );
    },
    enabled: !!agent,
    initialData: () => [],
  });
}

export function useLogs<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const [logs, setLogs] = useState<AnyRef[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const contextId = agent.getContextId(ref);
  const queryClient = useQueryClient();

  const workingMemory = useWorkingMemory({ agent, ...ref });

  logger.debug("Working memory updated", {
    dataLength: workingMemory.data?.length,
    isLoading: workingMemory.isLoading
  });

  useEffect(() => {
    const unsubscribe = agent.subscribeContext(contextId, (log, done) => {
      setLogs((logs) => [...logs.filter((l) => l.id !== log.id), log]);

      // Track running state based on log activity
      if (log.ref === "input" && log.type === "message") {
        setIsRunning(true);
      } else if (log.ref === "step" && done) {
        setIsRunning(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [contextId, agent]);

  useEffect(() => {
    setLogs([]);
  }, [contextId]);

  useEffect(() => {
    setLogs(
      workingMemory.data
        .slice()
        .sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1))
    );
  }, [workingMemory.data, workingMemory.dataUpdatedAt]);

  const clearMemory = async () => {
    await agent.memory.store.delete("working-memory:" + contextId);

    setLogs([]);

    workingMemory.refetch();

    await queryClient.resetQueries({
      queryKey: ["context", contextId],
    });
  };

  return {
    logs,
    setLogs,
    workingMemory,
    clearMemory,
    isRunning,
  };
}

// New hook specifically for tracking agent running state
export function useAgentRunning<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const contextId = agent.getContextId(ref);

  useEffect(() => {
    const unsubscribe = agent.subscribeContext(contextId, (log, done) => {
      // Track running state based on log activity
      if (log.ref === "input" && log.type === "message") {
        setIsRunning(true);
      } else if (log.ref === "step" && done) {
        setIsRunning(false);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [contextId, agent]);

  return isRunning;
}

type SendArguments = {
  input: {
    type: string;
    data: any;
  };
  modelName?: string;
  actions?: AnyAction[];
  contexts?: ContextRef[];
};

export function useSend<TContext extends AnyContext>({
  agent,
  context,
  args,
  onSuccess,
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
  onSuccess?: (data: AnyRef[], variables: SendArguments) => Promise<void>;
}) {
  const abortControllerRef = useRef<AbortController>();

  const id = agent.getContextId({
    context,
    args,
  });

  const send = useMutation({
    mutationKey: ["send", id],
    mutationFn: async ({ input, actions, contexts }: SendArguments) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      return await agent.send({
        context,
        args,
        input,
        contexts,
        actions,
        abortSignal: controller.signal,
        // model: modelName ? getModel(modelName) : undefined,
      });
    },

    async onSuccess(data: AnyRef[], variables: SendArguments) {
      onSuccess?.(data, variables);
    },

    onError(error: unknown) {
      logger.error("Send mutation failed", error);
    },
  });

  return { send, abortControllerRef };
}

// New hook to ensure agent is fully initialized
export function useInitializedAgent() {
  const { agent, isInitialized, initializationPromise, initializeAgent } =
    useAgentStore();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializeAgent();
        if (mounted) {
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initializeAgent]);

  return {
    agent: isInitialized ? agent : null,
    isLoading: !isInitialized,
    error,
    isInitialized,
  };
}
