import { MessageType } from "@/components/message-list";
import { Log } from "@daydreamsai/core";
import { useState, useCallback, useMemo } from "react";

export function useMessages() {
  const [messages, setMessages] = useState<MessageType[]>([]);

  // Memoized function to update messages
  const updateMessage = useCallback(
    (log: Log, messageType: MessageType["type"], messageContent: string) => {
      setMessages((prevMessages) => {
        // Check if message with this ID already exists
        const messageIndex = prevMessages.findIndex((msg) => msg.id === log.id);

        // If message exists, update it instead of filtering and creating a new array
        if (messageIndex !== -1) {
          const newMessages = [...prevMessages];
          newMessages[messageIndex] = {
            id: log.id,
            type: messageType,
            message: messageContent,
          };
          return newMessages;
        }

        // If message doesn't exist, append it
        return [
          ...prevMessages,
          {
            id: log.id,
            type: messageType,
            message: messageContent,
          },
        ];
      });
    },
    []
  );

  const handleLog = useCallback(
    (log: Log, _done: boolean) => {
      if (log.ref === "input") {
        updateMessage(log, "user", log.data.content);
      } else if (log.ref === "thought") {
        updateMessage(log, "thought", log.content + "\n");
      } else if (log.ref === "output" && log.type === "message") {
        updateMessage(log, "assistant", log.data.content);
      } else if (log.ref === "action_call") {
        updateMessage(
          log,
          "system",
          `Action call\nAction:${log.name}\nId:${log.id}\nData:${JSON.stringify(log.data)}`
        );
      } else if (log.ref === "action_result") {
        updateMessage(
          log,
          "system",
          `Action Result\nAction:${log.name}\nId:${log.id}\nData:${JSON.stringify(log.data)}`
        );
      }
    },
    [updateMessage]
  );

  // Memoize the return value to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      messages,
      setMessages,
      handleLog,
    }),
    [messages, handleLog]
  );

  return returnValue;
}
