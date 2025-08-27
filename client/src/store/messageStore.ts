import { create } from "zustand";
import { subscribeWithSelector, persist } from "zustand/middleware";
import { ActionResult, AnyRef } from "@daydreamsai/core";

export interface UnifiedMessage {
  id: string;
  timestamp: number;
  contextId: string;
  type: "user" | "agent" | "system" | "action" | "error" | "thought";
  content: string;
  status: "pending" | "streaming" | "completed" | "error";
  metadata?: {
    actionType?: string;
    actionData?: unknown;
    result?: ActionResult;
    parentId?: string;
    logRef?: string;
    callId?: string;
    isComplete?: boolean;
    streamBuffer?: string;
  };
}

export const MESSAGE_TYPES = {
  USER: "user" as const,
  AGENT: "agent" as const,
  SYSTEM: "system" as const,
  ACTION: "action" as const,
  ERROR: "error" as const,
  THOUGHT: "thought" as const,
};

export const MESSAGE_STATUS = {
  PENDING: "pending" as const,
  STREAMING: "streaming" as const,
  COMPLETED: "completed" as const,
  ERROR: "error" as const,
};

interface MessageStore {
  messages: Map<string, UnifiedMessage[]>;
  streamingMessageId: string | null;
  isStreaming: boolean;

  addMessage: (
    contextId: string,
    message: Omit<UnifiedMessage, "id" | "timestamp" | "contextId">
  ) => string;
  updateMessage: (messageId: string, update: Partial<UnifiedMessage>) => void;
  appendToMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: (contextId: string) => void;

  startStreaming: (messageId: string) => void;
  stopStreaming: () => void;

  getMessages: (contextId: string) => UnifiedMessage[];
  getMessageById: (messageId: string) => UnifiedMessage | undefined;
  getStreamingMessage: () => UnifiedMessage | undefined;

  addAgentLog: (contextId: string, log: AnyRef) => string;
  updateFromActionResult: (callId: string, result: ActionResult) => void;
}

export function convertAgentLogToMessage(
  log: AnyRef
): Omit<UnifiedMessage, "id" | "timestamp" | "contextId"> {
  let type: UnifiedMessage["type"] = "system";
  let content = "";

  switch (log.ref) {
    case "input":
      type = "user";
      content = log.data?.content || (log as any).content || "User message";
      break;

    case "output":
      type = "agent";
      content = log.data?.content || (log as any).content || "Agent response";
      break;

    case "thought":
      type = "thought";
      content = (log as any).content || "Agent thinking...";
      break;

    case "action_call":
      type = "action";
      content = `Calling ${(log as any).name}`;
      break;

    case "action_result":
      type = "system";
      content = (log as any).data?.success ? "Action completed" : "Action failed";
      break;

    default:
      type = "system";
      content = `${log.ref}: ${(log as any).content || "System message"}`;
  }

  return {
    type,
    content,
    status: "completed",
    metadata: {
      logRef: log.ref,
      callId: (log as any).callId,
      actionType: (log as any).name,
      actionData: (log as any).data,
    },
  };
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function findAndUpdateMessage(
  messages: Map<string, UnifiedMessage[]>,
  messageId: string,
  updateFn: (
    message: UnifiedMessage,
    contextId: string,
    messages: UnifiedMessage[]
  ) => UnifiedMessage[]
): Map<string, UnifiedMessage[]> {
  const newMessages = new Map(messages);

  for (const [contextId, contextMessages] of newMessages) {
    const messageIndex = contextMessages.findIndex((m) => m.id === messageId);
    if (messageIndex !== -1) {
      const message = contextMessages[messageIndex];
      const updatedMessages = updateFn(message, contextId, contextMessages);
      newMessages.set(contextId, updatedMessages);
      break;
    }
  }

  return newMessages;
}

export const useMessageStore = create<MessageStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      messages: new Map(),
      streamingMessageId: null,
      isStreaming: false,

    addMessage: (
      contextId: string,
      messageData: Omit<UnifiedMessage, "id" | "timestamp" | "contextId">
    ) => {
      const id = generateMessageId();
      const message: UnifiedMessage = {
        ...messageData,
        id,
        contextId,
        timestamp: Date.now(),
      };

      console.log("🏪 MESSAGE STORE - Adding message:", {
        contextId,
        messageId: id,
        type: messageData.type,
        content: messageData.content.substring(0, 100),
        status: messageData.status
      });

      set((state) => {
        const newMessages = new Map(state.messages);
        const contextMessages = newMessages.get(contextId) || [];
        contextMessages.push(message);
        newMessages.set(contextId, contextMessages);

        console.log("📦 MESSAGE STORE - State updated:", {
          contextId,
          totalMessages: contextMessages.length,
          allContexts: Array.from(newMessages.keys())
        });

        return { messages: newMessages };
      });

      return id;
    },

    updateMessage: (messageId: string, update: Partial<UnifiedMessage>) => {
      set((state) => {
        return {
          messages: findAndUpdateMessage(
            state.messages,
            messageId,
            (_, __, messages) => {
              const messageIndex = messages.findIndex(
                (m) => m.id === messageId
              );
              const updatedMessages = [...messages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                ...update,
              };
              return updatedMessages;
            }
          ),
        };
      });
    },

    appendToMessage: (messageId: string, content: string) => {
      set((state) => {
        return {
          messages: findAndUpdateMessage(
            state.messages,
            messageId,
            (message, _, messages) => {
              const messageIndex = messages.findIndex(
                (m) => m.id === messageId
              );
              const updatedMessages = [...messages];
              updatedMessages[messageIndex] = {
                ...message,
                content: message.content + content,
                status: "streaming",
                metadata: {
                  ...message.metadata,
                  streamBuffer:
                    (message.metadata?.streamBuffer || "") + content,
                },
              };
              return updatedMessages;
            }
          ),
        };
      });
    },

    deleteMessage: (messageId: string) => {
      set((state) => {
        return {
          messages: findAndUpdateMessage(
            state.messages,
            messageId,
            (_, __, messages) => {
              return messages.filter((m) => m.id !== messageId);
            }
          ),
        };
      });
    },

    clearMessages: (contextId: string) => {
      set((state) => {
        const newMessages = new Map(state.messages);
        newMessages.delete(contextId);
        return { messages: newMessages };
      });
    },

    startStreaming: (messageId: string) => {
      set({ streamingMessageId: messageId, isStreaming: true });
    },

    stopStreaming: () => {
      const { streamingMessageId } = get();
      if (streamingMessageId) {
        get().updateMessage(streamingMessageId, {
          status: "completed",
          metadata: {
            ...get().getMessageById(streamingMessageId)?.metadata,
            isComplete: true,
          },
        });
      }
      set({ streamingMessageId: null, isStreaming: false });
    },

    getMessages: (contextId: string) => {
      return get().messages.get(contextId) || [];
    },

    getMessageById: (messageId: string) => {
      const { messages } = get();
      for (const contextMessages of messages.values()) {
        const message = contextMessages.find((m) => m.id === messageId);
        if (message) return message;
      }
      return undefined;
    },

    getStreamingMessage: () => {
      const { streamingMessageId } = get();
      return streamingMessageId
        ? get().getMessageById(streamingMessageId)
        : undefined;
    },

    addAgentLog: (contextId: string, log: AnyRef) => {
      const messageData = convertAgentLogToMessage(log);
      return get().addMessage(contextId, messageData);
    },

    updateFromActionResult: (callId: string, result: ActionResult) => {
      set((state) => {
        const newMessages = new Map(state.messages);

        for (const [contextId, messages] of newMessages) {
          const messageIndex = messages.findIndex(
            (m) => m.metadata?.callId === callId
          );
          if (messageIndex !== -1) {
            const message = messages[messageIndex];
            const updatedMessages = [...messages];
            updatedMessages[messageIndex] = {
              ...message,
              status: result.data?.success ? "completed" : "error",
              content: result.data?.success
                ? `${message.content} - Completed`
                : `${message.content} - Failed: ${result.data?.message || "Unknown error"}`,
              metadata: {
                ...message.metadata,
                result,
                isComplete: true,
              },
            };
            newMessages.set(contextId, updatedMessages);
            break;
          }
        }

        return { messages: newMessages };
      });
    },
  })),
    {
      name: "gigaverse-messages-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const stored = JSON.parse(str);
          // Convert the messages array back to a Map
          if (stored.state?.messages) {
            stored.state.messages = new Map(Object.entries(stored.state.messages));
          }
          return stored;
        },
        setItem: (name, value) => {
          // Convert the Map to a plain object for storage
          const toStore = {
            ...value,
            state: {
              ...value.state,
              messages: value.state.messages ? Object.fromEntries(value.state.messages) : {}
            }
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

export const useContextMessages = (contextId: string) =>
  useMessageStore((state) => state.getMessages(contextId));

export const useStreamingStatus = () =>
  useMessageStore((state) => ({
    isStreaming: state.isStreaming,
    streamingMessage: state.getStreamingMessage(),
  }));

export const useMessageById = (messageId: string) =>
  useMessageStore((state) => state.getMessageById(messageId));