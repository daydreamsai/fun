import { MessageType } from "@/components/message-list";
import { Log } from "@daydreamsai/core";
import { useState, useCallback, useMemo } from "react";

export function useMessages() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    (log: Log, done: boolean) => {
      if (log.ref === "input") {
        updateMessage(log, "user", log.data.content);
        setIsLoading(true);
      } else if (log.ref === "thought") {
        updateMessage(log, "thought", log.content + "\n");
        setIsLoading(true);
      } else if (log.ref === "output" && log.type === "message") {
        updateMessage(log, "assistant", log.data.content);
        // When we get the output message, we're done loading
        setIsLoading(true);
      } else if (log.ref === "action_call") {
        updateMessage(
          log,
          "system",
          `Action call\nAction:${log.name}\nId:${log.id}\nData:${JSON.stringify(log.data)}`
        );
        setIsLoading(true);
      } else if (log.ref === "action_result") {
        updateMessage(
          log,
          "system",
          `Action Result\nAction:${log.name}\nId:${log.id}\nData:${JSON.stringify(log.data)}`
        );
        setIsLoading(true);
      }

      // If done flag is true, ensure loading state is turned off
      if (done) {
        setIsLoading(false);
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
      isLoading,
      setIsLoading,
    }),
    [messages, handleLog, isLoading]
  );

  return returnValue;
}
