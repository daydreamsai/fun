import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageInput } from "@/components/chat/MessageInput";
import { UnifiedMessagesList } from "@/components/chat/UnifiedMessagesList";
import { GigaverseAction } from "./Actions";
import { useStreamingMessages } from "@/hooks/useStreamingMessages";
import { useAgentStore } from "@/store/agentStore";
import { gigaverseContext } from "../context";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { ScrollText } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateEditorDialog } from "@/components/chat/template-editor-dialog";
import { gigaverseVariables, defaultInstructions } from "../prompts";
import { useTemplateStore } from "@/store/templateStore";
import { useContextState } from "@/hooks/agent";

interface ChatTabProps {
  chatId: string;
}

export function ChatTab({ chatId }: ChatTabProps) {
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const agent = useAgentStore((state) => state.agent);
  const { selectTemplate } = useTemplateStore();

  // Wrap selectTemplate to restart agent when templates change
  const selectTemplateAndRestart = async (
    key: string,
    section: string,
    templateId: string
  ) => {
    selectTemplate(key, section, templateId);
    // Restart agent to pick up new templates
    await agent.start();
  };

  const { messages, isStreaming, sendMessage } = useStreamingMessages({
    agent: agent!,
    context: gigaverseContext,
    args: { id: chatId },
    options: {
      showThoughts: true,
      showSystem: true,
      showActions: true,
    }
  });

  console.log("💬 CHAT TAB RENDER:", {
    chatId,
    messageCount: messages.length,
    messages: messages.map(m => ({
      id: m.id,
      type: m.type,
      status: m.status,
      content: m.content.substring(0, 50)
    })),
    isStreaming
  });

  const handleSubmitMessage = async (message: string) => {
    await sendMessage(message);
  };

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Handle auto-scroll for new messages
  useEffect(() => {
    if (messages.length > 0) {
      const container = scrollAreaRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages.length]);

  const ctxState = useContextState({
    agent,
    context: gigaverseContext,
    args: { id: chatId },
  });

  return (
    <div className="h-full flex flex-col">
      <TemplateEditorDialog
        open={showTemplateEditor}
        title="Gigaverse Instructions"
        variables={gigaverseVariables}
        templateKey="gigaverse"
        sections={{
          instructions: {
            label: "Gigaverse Strategy",
            default: {
              id: "gigaverse-instructions-default",
              title: "Default",
              section: "instructions",
              prompt: defaultInstructions,
              tags: ["default"],
            },
          },
        }}
        setSelected={selectTemplateAndRestart}
        onOpenChange={setShowTemplateEditor}
      />
      
      <div 
        className="flex-1 min-h-0 overflow-y-auto"
        ref={scrollAreaRef}
      >
        <div className="p-2">
          <UnifiedMessagesList
            messages={messages}
            streamingMessageId={isStreaming ? messages.find(m => m.status === 'streaming')?.id : null}
            components={{
              action: ({ message }) => {
                if (message.metadata?.actionType?.startsWith("gigaverse")) {
                  const actionResult = message.metadata?.result;
                  
                  return (
                    <GigaverseAction
                      key={message.id}
                      call={{
                        id: message.metadata.callId || message.id,
                        name: message.metadata.actionType,
                        data: message.metadata.actionData,
                        ref: "action_call" as const
                      }}
                      result={actionResult}
                      gameData={ctxState.data?.options.game}
                    />
                  );
                }

                // Always show error messages
                if (message.status === "error") {
                  return null; // This will fall back to the default action component
                }

                return null;
              },
            }}
          />
        </div>
      </div>

      <div className="flex p-2 border-t bg-background flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              disabled={isStreaming}
              onClick={() => setShowTemplateEditor(true)}
              className="h-full flex text-muted-foreground border-r-0"
            >
              <ScrollText />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Instructions</p>
          </TooltipContent>
        </Tooltip>
        <MessageInput
          isLoading={isStreaming}
          disabled={ctxState.error !== null}
          onSubmit={handleSubmitMessage}
          placeholderText="Type a message to play Gigaverse..."
        />
      </div>
    </div>
  );
}