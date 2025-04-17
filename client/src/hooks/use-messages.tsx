import { MessageType } from "@/components/message-list";
import { AnyRef, Log } from "@daydreamsai/core";
import { useState, useCallback, useMemo } from "react";

// Define the enum for valid action names
export enum ActionName {
  AttackInDungeon = "attackInDungeon",
  GetUpcomingEnemies = "getUpcomingEnemies",
  GetPlayerState = "getPlayerState",
  StartNewRun = "startNewRun",
  ManuallyUpdateState = "manuallyUpdateState",
}

// Define the enum for valid log ref values
export enum LogRefType {
  Input = "input",
  Thought = "thought",
  Output = "output",
  ActionCall = "action_call",
  ActionResult = "action_result",
}

export function useMessages() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [thoughts, setThoughts] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Type definition for action info
  type ActionInfo = NonNullable<MessageType["action"]>;

  // Add a message to the messages array
  const updateMessage = useCallback(
    (
      log: Log,
      messageType: MessageType["type"],
      messageContent: string,
      actionInfo?: MessageType["action"]
    ) => {
      const messageData = {
        id: log.id,
        type: messageType,
        message: messageContent,
        ...(actionInfo && { action: actionInfo }),
        log: log,
      };

      if (messageType === "thought") {
        setThoughts((prevThoughts) => {
          const existingMessageIndex = prevThoughts.findIndex(
            (msg) => msg.id === log.id
          );
          if (existingMessageIndex !== -1) {
            const newThoughts = [...prevThoughts];
            newThoughts[existingMessageIndex] = messageData;
            return newThoughts;
          } else {
            return [...prevThoughts, messageData];
          }
        });
      } else {
        setMessages((prevMessages) => {
          const existingMessageIndex = prevMessages.findIndex(
            (msg) => msg.id === log.id
          );

          if (existingMessageIndex !== -1) {
            const newMessages = [...prevMessages];
            newMessages[existingMessageIndex] = messageData;
            return newMessages;
          } else {
            return [...prevMessages, messageData];
          }
        });
      }
    },
    []
  );

  // Update an action result in an existing message
  const updateActionResult = useCallback((actionId: string, result: any) => {
    setMessages((prevMessages) => {
      const messageIndex = prevMessages.findIndex((msg) => msg.id === actionId);
      // Ensure message and action exist before proceeding
      if (messageIndex === -1 || !prevMessages[messageIndex].action) {
        console.warn(
          `Action message with ID ${actionId} not found or lacks action info.`
        );
        return prevMessages;
      }

      const newMessages = [...prevMessages];
      const message = newMessages[messageIndex];
      const existingAction = message.action; // Guaranteed to exist by the check above

      newMessages[messageIndex] = {
        ...message,
        action: {
          // Explicitly carry over existing action properties to satisfy type checking
          type: existingAction!.type,
          ...(existingAction!.move && { move: existingAction!.move }),
          result: result,
        },
      };

      return newMessages;
    });
  }, []);

  // Handle incoming logs from the agent
  const handleLog = useCallback(
    (log: AnyRef, done: boolean) => {
      if (log.ref === LogRefType.Input) {
        updateMessage(log, "user", log.data.content);
        setIsLoading(true);
      } else if (log.ref === LogRefType.Thought) {
        updateMessage(log, "thought", log.content + "\n");
        setIsLoading(true);
      } else if (log.ref === LogRefType.Output && log.type === "message") {
        updateMessage(log, "assistant", log.data.content);
        setIsLoading(true);
      } else if (log.ref === LogRefType.ActionCall) {
        setIsLoading(true);
      } else if (log.ref === LogRefType.ActionResult) {
        if (log.data.error) {
          updateMessage(
            log,
            "error",
            log.data.error + "\n" + log.data.message + "\n" + "trying again..."
          );
          setIsLoading(false);
          return;
        }

        const actionInfo: ActionInfo = {
          type: log.name as `${ActionName}`,
          result: log.data.result?.run?.players[0].otherPlayerWin
            ? "lose"
            : "win",
          move: log.data.result?.run?.players[0].lastMove,
        };

        const readableResult = `Result for ${log.name}
Data: ${JSON.stringify(log.data)}`;

        updateMessage(log, "system", readableResult, actionInfo);
        setIsLoading(true);
      }

      if (done) {
        setIsLoading(false);
      }
    },
    [updateMessage, updateActionResult]
  );

  return useMemo(
    () => ({
      messages,
      setMessages,
      thoughts,
      setThoughts,
      handleLog,
      isLoading,
      setIsLoading,
    }),
    [messages, thoughts, handleLog, isLoading]
  );
}
