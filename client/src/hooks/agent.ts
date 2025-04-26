import {
  AnyContext,
  AnyRef,
  ContextRef,
  getWorkingMemoryAllLogs,
  InferSchemaArguments,
  AnyAction,
  AnyAgent,
} from "@daydreamsai/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/agentStore";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";

export function useContextState<TContext extends AnyContext>(ref: {
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const agent = useAgentStore((state) => state.agent);
  const contextId = agent.getContextId(ref);
  return useQuery({
    queryKey: ["context", contextId],
    queryFn: async () => {
      return await agent.getContext(ref);
    },
  });
}

export function useWorkingMemory<TContext extends AnyContext>(ref: {
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const agent = useAgentStore((state) => state.agent);
  const contextId = agent.getContextId(ref);
  return useQuery({
    queryKey: ["workingMemory", contextId],
    queryFn: async () => {
      return structuredClone(
        getWorkingMemoryAllLogs(await agent.getWorkingMemory(contextId))
      );
    },
    initialData: () => [],
  });
}

export function useLogs<TContext extends AnyContext>(ref: {
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const agent = useAgentStore((state) => state.agent);
  const [logs, setLogs] = useState<AnyRef[]>([]);
  const contextId = agent.getContextId(ref);

  const workingMemory = useWorkingMemory(ref);

  useEffect(() => {
    const unsubscribe = agent.subscribeContext(contextId, (log) => {
      setLogs((logs) => [...logs.filter((l) => l.id !== log.id), log]);
    });
    return () => {
      unsubscribe();
    };
  }, [contextId]);

  useEffect(() => {
    setLogs([]);
  }, [contextId]);

  useEffect(() => {
    setLogs((logs) => {
      const map = new Map(
        [...workingMemory.data, ...logs].map((log) => [log.id, log])
      );

      return Array.from(map.values()).sort((a, b) =>
        a.timestamp >= b.timestamp ? 1 : -1
      );
    });
  }, [workingMemory.data]);

  return {
    logs,
    setLogs,
    workingMemory,
  };
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
    mutationFn: async ({
      input,
      modelName,
      actions,
      contexts,
    }: SendArguments) => {
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

    async onSuccess(data, variables) {
      onSuccess?.(data, variables);
    },

    onError(error) {
      console.error(error);
    },
  });

  return { send, abortControllerRef };
}
