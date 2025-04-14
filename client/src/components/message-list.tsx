import {
  ChevronsUpDown,
  Loader2,
  Flag,
  Shield,
  Play,
  SkullIcon,
  TrophyIcon,
  Swords,
  RefreshCw,
  HandIcon,
  ScissorsIcon,
  PackageIcon,
  Package2Icon,
  GiftIcon,
  CircleIcon,
  Sword,
  ShieldAlert,
  Stars,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Log } from "@daydreamsai/core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { useSettingsStore } from "@/store/settingsStore";

export interface MessageType {
  id: string;
  type:
    | "user"
    | "assistant"
    | "thought"
    | "system"
    | "error"
    | "other"
    | "welcome"
    | "info";
  message?: string;
  error?: string;
  action?: {
    type:
      | "attackInDungeon"
      | "getUpcomingEnemies"
      | "getPlayerState"
      | "startNewRun"
      | "manuallyUpdateState";
    result?: "win" | "lose" | "draw";
    move?:
      | "rock"
      | "paper"
      | "scissor"
      | "loot_one"
      | "loot_two"
      | "loot_three";
  };
  log: Log;
}

interface MessagesListProps {
  messages: MessageType[];
  isLoading?: boolean;
}

export function MessagesList({
  messages,
  isLoading = false,
}: MessagesListProps) {
  // Get show message settings from the store
  const showThoughtMessages = useSettingsStore(
    (state) => state.showThoughtMessages
  );
  const showSystemMessages = useSettingsStore(
    (state) => state.showSystemMessages
  );

  // Filter messages based on settings
  const filteredMessages = messages.filter((msg) => {
    if (msg.type === "thought" && !showThoughtMessages) return false;
    if (msg.type === "system" && !showSystemMessages) return false;
    return true;
  });

  // Parse message content if it appears to be JSON
  const parseMessageContent = (content: string | undefined) => {
    if (!content) return null;

    // Check if content is potentially JSON
    if (content.startsWith("{") && content.endsWith("}")) {
      try {
        const parsedContent = JSON.parse(content);
        // If it's a valid JSON with user and content fields, return formatted content
        if (parsedContent.user && parsedContent.content) {
          return parsedContent.content;
        }
      } catch (e) {
        // If parsing fails, just return the original content
      }
    }

    return content;
  };

  // Helper function to render action icon
  const renderActionIcon = (action: MessageType["action"]) => {
    if (!action) return null;

    // Base icon classes
    const iconClass = "h-5 w-5 mr-2";

    switch (action.type) {
      case "attackInDungeon":
        if (action.result === "win") {
          return <TrophyIcon className={`${iconClass} text-green-500`} />;
        } else if (action.result === "lose") {
          return <SkullIcon className={`${iconClass} text-red-500`} />;
        } else {
          return <Swords className={`${iconClass} text-yellow-500`} />;
        }

      case "getPlayerState":
        return <Shield className={`${iconClass} text-blue-500`} />;

      case "getUpcomingEnemies":
        return <Flag className={`${iconClass} text-purple-500`} />;

      case "startNewRun":
        return <Play className={`${iconClass} text-green-500`} />;

      case "manuallyUpdateState":
        return <RefreshCw className={`${iconClass} text-amber-500`} />;

      default:
        return null;
    }
  };

  // Helper function to render move icon
  const renderMoveIcon = (move?: string) => {
    if (!move) return null;

    const iconClass = "h-6 w-6";

    switch (move) {
      case "rock":
        return <Sword className={`${iconClass} text-stone-500`} />;
      case "paper":
        return <ShieldAlert className={`${iconClass} text-blue-400`} />;
      case "scissor":
        return <Stars className={`${iconClass} text-violet-500`} />;
      case "loot_one":
        return <PackageIcon className={`${iconClass} text-amber-500`} />;
      case "loot_two":
        return <Package2Icon className={`${iconClass} text-emerald-500`} />;
      case "loot_three":
        return <GiftIcon className={`${iconClass} text-purple-500`} />;
      default:
        return null;
    }
  };

  console.log(filteredMessages);

  return (
    <div className="flex flex-col space-y-4 mx-auto">
      <AnimatePresence mode="popLayout">
        {filteredMessages.slice(-3).map((msg, i) => {
          const baseBubble = `relative p-4 text-sm shadow-md transition-all duration-200 max-w-[90%] min-w-[40%] whitespace-pre-wrap break-words border-opacity-50`;

          let containerClass = "flex items-start";
          let bubbleClass = baseBubble;

          switch (msg.type) {
            case "user":
              containerClass += " justify-start";
              bubbleClass += ` bg-card text-foreground mr-2 self-end hover:brightness-110 border`;
              break;

            case "assistant":
              containerClass += " justify-start";
              bubbleClass += ` bg-card text-foreground border hover:brightness-105 border-primary/50`;
              break;

            case "thought":
              containerClass += " justify-start";
              bubbleClass += ` bg-card text-muted-foreground border hover:brightness-105`;
              break;

            case "error":
              containerClass += " justify-center";
              bubbleClass += ` bg-card text-destructive border hover:brightness-105 border-destructive/10 bg-destructive/10`;
              break;

            case "welcome":
              containerClass += " justify-center";
              bubbleClass += ` bg-card text-accent-foreground border hover:brightness-105`;
              break;

            case "info":
              containerClass += " justify-center";
              bubbleClass += ` bg-card text-secondary-foreground border hover:brightness-105`;
              break;

            default:
              containerClass += " justify-start";
              bubbleClass += ` bg-card text-card-foreground border hover:brightness-105`;
          }

          return (
            <motion.div
              key={`${msg.id || "msg"}-${i}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
              className={containerClass}
            >
              <motion.div layout className={bubbleClass}>
                {msg.type === "thought" || msg.type === "system" ? (
                  <Collapsible>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
                      {renderActionIcon(msg.action)}
                      {msg.type}

                      <CollapsibleTrigger>
                        <Button variant="ghost" size="sm">
                          <ChevronsUpDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      {msg.message && (
                        <div className="text-base">
                          {parseMessageContent(msg.message)}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center">
                      {renderActionIcon(msg.action)}
                      {msg.type}
                    </div>
                    {msg.message && (
                      <div className="text-base">
                        {parseMessageContent(msg.message)}
                      </div>
                    )}
                  </>
                )}

                {msg.error && (
                  <div className="text-sm font-medium text-destructive mt-1">
                    {msg.error}
                  </div>
                )}

                {msg.action && msg.action.type === "attackInDungeon" && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-md border border-primary/50">
                    {msg.action.move && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderMoveIcon(msg.action.move)}
                          <span className="text-sm font-medium capitalize">
                            {msg.action.move.replace("_", " ")}
                          </span>
                        </div>
                        {msg.action.result && (
                          <div
                            className={`px-2 py-1 rounded text-xs uppercase font-bold ${
                              msg.action.result === "win"
                                ? "bg-green-500/10 text-green-500"
                                : msg.action.result === "lose"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {msg.action.result}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {msg.action && msg.action.type === "startNewRun" && (
                  <div className="mt-3 p-3 bg-green-500/5 rounded-md border border-green-500/30 flex items-center gap-2">
                    <Play className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">New Run Started</span>
                  </div>
                )}

                {msg.action && msg.action.type === "getPlayerState" && (
                  <div className="mt-3 p-3 bg-blue-500/5 rounded-md border border-blue-500/30 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">
                      Player Status Updated
                    </span>
                  </div>
                )}

                {msg.action && msg.action.type === "getUpcomingEnemies" && (
                  <div className="mt-3 p-3 bg-purple-500/5 rounded-md border border-purple-500/30 flex items-center gap-2">
                    <Flag className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">Enemies Scouted</span>
                  </div>
                )}

                {msg.action && msg.action.type === "manuallyUpdateState" && (
                  <div className="mt-3 p-3 bg-amber-500/5 rounded-md border border-amber-500/30 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium">
                      Game State Updated
                    </span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}

        {/* Loading indicator with animation */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center py-6"
          >
            <div className="flex items-center gap-2 bg-card p-3 rounded-md border animate-pulse">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
