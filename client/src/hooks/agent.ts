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

export function useContextState<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const contextId = agent.getContextId(ref);
  return useQuery({
    queryKey: ["context", contextId],
    queryFn: async () => {
      return await agent.getContext(ref);
    },
  });
}

export function useWorkingMemory<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
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

export function useLogs<TContext extends AnyContext>({
  agent,
  ...ref
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const [logs, setLogs] = useState<AnyRef[]>([]);
  const contextId = agent.getContextId(ref);
  const queryClient = useQueryClient();

  const workingMemory = useWorkingMemory({ agent, ...ref });

  useEffect(() => {
    const unsubscribe = agent.subscribeContext(contextId, (log, _done) => {
      setLogs((logs) => [...logs.filter((l) => l.id !== log.id), log]);
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

    onError(error: any) {
      console.log({ error });
      console.error(error);
    },
  });

  return { send, abortControllerRef };
}
