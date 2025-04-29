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

export function useContextState<TContext extends AnyContext>(ref: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const contextId = ref.agent.getContextId(ref);
  return useQuery({
    queryKey: ["context", contextId],
    queryFn: async () => {
      return await ref.agent.getContext(ref);
    },
  });
}

export function useWorkingMemory<TContext extends AnyContext>(ref: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
}) {
  const contextId = ref.agent.getContextId(ref);

  return useQuery({
    queryKey: ["workingMemory", contextId],
    queryFn: async () => {
      return structuredClone(
        getWorkingMemoryAllLogs(await ref.agent.getWorkingMemory(contextId))
      );
    },
    initialData: () => [],
  });
}

export function useLogs<TContext extends AnyContext>(ref: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
  amount?: number;
}) {
  const [logs, setLogs] = useState<AnyRef[]>([]);
  const contextId = ref.agent.getContextId(ref);
  const queryClient = useQueryClient();

  const workingMemory = useWorkingMemory(ref);

  useEffect(() => {
    const unsubscribe = ref.agent.subscribeContext(contextId, (log) => {
      setLogs((logs) => [...logs.filter((l) => l.id !== log.id), log]);
    });
    return () => {
      unsubscribe();
    };
  }, [contextId, ref.agent]);

  useEffect(() => {
    setLogs([]);
  }, [contextId]);

  useEffect(() => {
    if (workingMemory.data) {
      setLogs((logs) => {
        const map = new Map(
          [...(workingMemory.data || []), ...logs].map((log) => [log.id, log])
        );

        return Array.from(map.values()).sort((a, b) =>
          a.timestamp >= b.timestamp ? 1 : -1
        );
      });
    }
  }, [workingMemory.data]);

  const clearMemory = async () => {
    await ref.agent.memory.store.delete("working-memory:" + contextId);
    setLogs([]);

    await queryClient.setQueryData(["workingMemory", contextId], []);

    await queryClient.resetQueries({
      queryKey: ["context", contextId],
    });
  };

  return {
    logs: logs.slice(-(ref.amount || 15)),
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
    mutationFn: async ({
      input,

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

    async onSuccess(data: AnyRef[], variables: SendArguments) {
      onSuccess?.(data, variables);
    },

    onError(error: any) {
      console.error(error);
    },
  });

  return { send, abortControllerRef };
}
