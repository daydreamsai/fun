import { MessageType } from "@/components/message-list";
import { AnyRef, Log } from "@daydreamsai/core";
import { useState, useCallback, useMemo } from "react";

export function useMessages() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Track current action to update result when action completes
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  // Track action types for better UX
  const [lastActionType, setLastActionType] = useState<string | null>(null);

  // Type definition for action info
  type ActionInfo = NonNullable<MessageType["action"]>;

  // Memoized function to update messages
  const updateMessage = useCallback(
    (
      log: Log,
      messageType: MessageType["type"],
      messageContent: string,
      actionInfo?: MessageType["action"]
    ) => {
      setMessages((prevMessages) => {
        // Check if message with this ID already exists
        const messageIndex = prevMessages.findIndex((msg) => msg.id === log.id);

        // If message exists, update it instead of filtering and creating a new array
        if (messageIndex !== -1) {
          const newMessages = [...prevMessages];
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            type: messageType,
            message: messageContent,
            // Only update action if provided, otherwise keep existing
            ...(actionInfo && { action: actionInfo }),
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
            ...(actionInfo && { action: actionInfo }),
          },
        ];
      });
    },
    []
  );

  // Utility to update action result in a message
  const updateActionResult = useCallback((actionId: string, result: any) => {
    setMessages((prevMessages) => {
      const messageIndex = prevMessages.findIndex((msg) => msg.id === actionId);
      if (messageIndex === -1) return prevMessages;

      const newMessages = [...prevMessages];
      const message = newMessages[messageIndex];

      // Only update if message has an action property
      if (!message.action) return prevMessages;

      let actionUpdate = { ...message.action };

      // Update based on action type
      if (
        message.action.type === "attackInDungeon" &&
        result?.result?.data?.run?.players
      ) {
        const players = result.result.data.run.players;
        if (players.length >= 2) {
          // First player is user, second is enemy
          const playerData = players[0];
          const enemyData = players[1];

          // Determine battle result
          let battleResult: "win" | "lose" | "draw" = "draw";
          if (playerData.thisPlayerWin === true) {
            battleResult = "win";
          } else if (enemyData.thisPlayerWin === true) {
            battleResult = "lose";
          }

          // Get the move from the original action data
          const move =
            message.action.move ||
            ((result.result.data?.action as string)?.toLowerCase() as any);

          actionUpdate = {
            ...actionUpdate,
            result: battleResult,
            move: move,
          };
        }
      } else if (message.action.type === "startNewRun") {
        // For new runs, we want to show a clean slate
        actionUpdate = {
          ...actionUpdate,
        };
      } else if (message.action.type === "getPlayerState") {
        // Add additional information if available
        actionUpdate = {
          ...actionUpdate,
        };
      } else if (message.action.type === "getUpcomingEnemies") {
        // Add enemy information if available
        actionUpdate = {
          ...actionUpdate,
        };
      }

      // Update the message with action result
      newMessages[messageIndex] = {
        ...message,
        action: actionUpdate,
      };

      return newMessages;
    });
  }, []);

  // Process attack moves to get the correct action type
  const processAttackMove = useCallback((data: any): ActionInfo | undefined => {
    const action = data?.action?.toLowerCase();

    if (!action) return undefined;

    if (action === "rock" || action === "paper" || action === "scissor") {
      return {
        type: "attackInDungeon",
        move: action as "rock" | "paper" | "scissor",
      };
    }

    if (
      action === "loot_one" ||
      action === "loot_two" ||
      action === "loot_three" ||
      action.startsWith("loot_")
    ) {
      let lootMove: "loot_one" | "loot_two" | "loot_three";

      // Normalize loot move to one of the accepted values
      if (action === "loot_one" || action === "loot_1" || action === "1") {
        lootMove = "loot_one";
      } else if (
        action === "loot_two" ||
        action === "loot_2" ||
        action === "2"
      ) {
        lootMove = "loot_two";
      } else {
        lootMove = "loot_three";
      }

      return {
        type: "attackInDungeon",
        move: lootMove,
      };
    }

    // Default action info if we can't determine the move
    return {
      type: "attackInDungeon",
    };
  }, []);

  const handleLog = useCallback(
    (log: AnyRef, done: boolean) => {
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
        // Save action ID for later result matching
        setCurrentActionId(log.id);
        setLastActionType(log.name);

        // Parse action data to extract action-specific information
        let actionInfo: ActionInfo | undefined;

        if (log.name === "attackInDungeon" && log.data) {
          actionInfo = processAttackMove(log.data);
        } else if (log.name === "getPlayerState") {
          actionInfo = { type: "getPlayerState" };
        } else if (log.name === "getUpcomingEnemies") {
          actionInfo = { type: "getUpcomingEnemies" };
        } else if (log.name === "startNewRun") {
          actionInfo = { type: "startNewRun" };
        } else if (log.name === "manuallyUpdateState") {
          actionInfo = { type: "manuallyUpdateState" };
        }

        // Create a more readable message for the user
        let readableMessage = "";
        if (log.name === "attackInDungeon" && actionInfo?.move) {
          if (actionInfo.move.startsWith("loot_")) {
            const lootNumber = actionInfo.move.replace("loot_", "");
            readableMessage = `Selecting loot option ${lootNumber}`;
          } else {
            readableMessage = `Playing ${actionInfo.move} move`;
          }
        } else if (log.name === "startNewRun") {
          readableMessage = "Starting a new dungeon run";
        } else if (log.name === "getPlayerState") {
          readableMessage = "Checking player status";
        } else if (log.name === "getUpcomingEnemies") {
          readableMessage = "Scouting upcoming enemies";
        } else if (log.name === "manuallyUpdateState") {
          readableMessage = "Updating game state";
        } else {
          readableMessage = `Action call\nAction: ${log.name}\nData: ${JSON.stringify(log.data)}`;
        }

        updateMessage(log, "system", readableMessage, actionInfo);
        setIsLoading(true);
      } else if (log.ref === "action_result") {
        // Update previous action message with result
        if (currentActionId) {
          updateActionResult(currentActionId, log.data);
        }

        // Create a readable result message
        let readableResult = "";
        if (
          lastActionType === "attackInDungeon" &&
          log.data?.result?.data?.run?.players
        ) {
          const players = log.data.result.data.run.players;
          if (players.length >= 2) {
            const playerData = players[0];
            const enemyData = players[1];

            if (playerData.thisPlayerWin === true) {
              readableResult = "Victory! You won this round.";
            } else if (enemyData.thisPlayerWin === true) {
              readableResult = "Defeat! You lost this round.";
            } else {
              readableResult = "Draw! Neither player won.";
            }

            // Add HP information if available
            if (playerData.health && enemyData.health) {
              readableResult += `\nYour HP: ${playerData.health.current}/${playerData.health.currentMax} | Enemy HP: ${enemyData.health.current}/${enemyData.health.currentMax}`;
            }
          }
        } else if (lastActionType === "startNewRun") {
          readableResult =
            "New run started successfully! Ready to explore the dungeon.";
        } else if (
          lastActionType === "getPlayerState" &&
          log.data?.result?.data?.run?.players
        ) {
          const players = log.data.result.data.run.players;
          if (players.length > 0) {
            const playerData = players[0];
            readableResult = `Player status updated.\nHP: ${playerData.health.current}/${playerData.health.currentMax}\nShield: ${playerData.shield.current}/${playerData.shield.currentMax}`;
          } else {
            readableResult = "Player status updated.";
          }
        } else if (lastActionType === "getUpcomingEnemies") {
          readableResult = "Enemy information gathered.";
        } else if (lastActionType === "manuallyUpdateState") {
          readableResult = "Game state updated successfully.";
        } else {
          readableResult = `Action Result\nAction: ${log.name}\nData: ${JSON.stringify(log.data)}...`;
        }

        updateMessage(log, "system", readableResult);
        setIsLoading(true);

        // Clear tracking variables
        setCurrentActionId(null);
        setLastActionType(null);
      }

      // If done flag is true, ensure loading state is turned off
      if (done) {
        setIsLoading(false);
      }
    },
    [
      updateMessage,
      updateActionResult,
      currentActionId,
      lastActionType,
      processAttackMove,
    ]
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
