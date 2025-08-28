import { ChevronsUpDown } from "lucide-react";
import { UnifiedMessage, MESSAGE_TYPES } from "@/store/messageStore";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Button } from "../ui/button";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "react-error-boundary";
import { logger } from "@/utils/logger";

export function MessageContainer({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative w-full py-2 px-4 text-sm border border-border/10 flex flex-col bg-card/50",
        className
      )}
    >
      {children}
    </div>
  );
}

export type MessageComponentsRecord = Partial<{
  [K in UnifiedMessage["type"]]: React.FC<{
    message: UnifiedMessage;
    isStreaming?: boolean;
  }>;
}>;

export const defaultMessageComponents: MessageComponentsRecord = {
  thought: ({ message }) => {
    return (
      <MessageContainer>
        <Collapsible>
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
            Thought
            <CollapsibleTrigger>
              <Button variant="ghost" size="icon" className="w-7 h-7 -mr-2">
                <ChevronsUpDown />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <pre className="whitespace-pre-wrap break-all my-2">
              {message.content.trim()}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </MessageContainer>
    );
  },
  
  user: ({ message }) => {
    return (
      <MessageContainer>
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          User
        </div>
        <div className="whitespace-pre-wrap break-all my-2">
          {message.content.trim()}
        </div>
      </MessageContainer>
    );
  },
  
  agent: ({ message, isStreaming }) => {
    return (
      <MessageContainer className={isStreaming ? "bg-blue-50/50 border-blue-200/50" : ""}>
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          Agent {isStreaming && <span className="text-blue-500">●</span>}
        </div>
        <div className="whitespace-pre-wrap break-all my-2">
          {message.content.trim()}
          {isStreaming && <span className="animate-pulse">|</span>}
        </div>
      </MessageContainer>
    );
  },
  
  action: ({ message }) => {
    const isCompleted = message.status === "completed";
    const hasFailed = message.status === "error";
    
    return (
      <MessageContainer className={cn(
        isCompleted && "bg-green-50/50 border-green-200/50",
        hasFailed && "bg-red-50/50 border-red-200/50"
      )}>
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          Action
          {isCompleted && <span className="text-green-500">✓</span>}
          {hasFailed && <span className="text-red-500">✗</span>}
          {message.status === "pending" && <span className="text-yellow-500">⏳</span>}
        </div>
        <div className="whitespace-pre-wrap break-all my-2">
          {message.content.trim()}
        </div>
        {message.metadata?.actionType && (
          <div className="text-xs text-muted-foreground mt-1">
            Action: {message.metadata.actionType}
          </div>
        )}
      </MessageContainer>
    );
  },
  
  system: ({ message }) => {
    return (
      <MessageContainer className="bg-gray-50/50 border-gray-200/50">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          System
        </div>
        <div className="whitespace-pre-wrap break-all my-2 text-sm text-muted-foreground">
          {message.content.trim()}
        </div>
      </MessageContainer>
    );
  },
  
  error: ({ message }) => {
    return (
      <MessageContainer className="bg-red-50/50 border-red-200/50">
        <div className="text-red-600 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          Error
        </div>
        <div className="whitespace-pre-wrap break-all my-2 text-red-700">
          {message.content.trim()}
        </div>
      </MessageContainer>
    );
  },
};

export function UnifiedMessagesList({
  messages,
  components,
  streamingMessageId,
  showThoughts = true,
  showSystem = true,
  showActions = true,
}: {
  messages: UnifiedMessage[];
  components?: MessageComponentsRecord;
  streamingMessageId?: string | null;
  showThoughts?: boolean;
  showSystem?: boolean;
  showActions?: boolean;
}) {
  logger.debug("Rendering unified messages", { count: messages.length });

  const filteredMessages = messages.filter((message) => {
    if (message.type === "thought" && !showThoughts) return false;
    if (message.type === "system" && !showSystem) return false;
    if (message.type === "action" && !showActions) return false;
    return true;
  });

  const allComponents = {
    ...defaultMessageComponents,
    ...components,
  };

  return (
    <div className="flex flex-col gap-4 md:max-w-3xl min-w-[40%]">
      {filteredMessages.map((message) => {
        const Component = allComponents[message.type];
        const isStreaming = streamingMessageId === message.id;

        return Component ? (
          <ErrorBoundary
            key={message.id}
            fallbackRender={({ error }) => {
              logger.error("Message component render failed", { 
                error, 
                messageId: message.id,
                messageType: message.type 
              });
              return (
                <MessageContainer className="bg-red-50/50 border-red-200/50">
                  <div className="text-red-600">Error rendering message</div>
                  <div className="text-xs text-muted-foreground">
                    Message ID: {message.id} | Type: {message.type}
                  </div>
                </MessageContainer>
              );
            }}
          >
            <Component message={message} isStreaming={isStreaming} />
          </ErrorBoundary>
        ) : (
          <MessageContainer key={message.id} className="bg-yellow-50/50 border-yellow-200/50">
            <div className="text-yellow-600 text-xs font-medium">
              Unknown message type: {message.type}
            </div>
            <div className="text-sm">{message.content}</div>
          </MessageContainer>
        );
      })}
    </div>
  );
}