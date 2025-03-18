import { ChevronsUpDown, Loader2 } from "lucide-react";
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

  return (
    <div className="flex flex-col space-y-4 mx-auto">
      {filteredMessages.map((msg, i) => {
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
            bubbleClass += ` bg-card text-destructive font-semibold border hover:brightness-105`;
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
          <div key={i} className={containerClass}>
            <div className={bubbleClass}>
              {msg.type === "thought" || msg.type === "system" ? (
                <Collapsible>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
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
                      <div className="text-base">{msg.message.trim()}</div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80">
                    {msg.type}
                  </div>
                  {msg.message && (
                    <div className="text-base">{msg.message.trim()}</div>
                  )}
                </>
              )}

              {msg.error && (
                <div className="text-sm font-medium text-destructive mt-1">
                  {msg.error}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 bg-card p-3 rounded-md border animate-pulse">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}
