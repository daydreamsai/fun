import { ChevronsUpDown } from "lucide-react";
import { AnyRef } from "@daydreamsai/core";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Button } from "../ui/button";
import { ReactNode } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "react-error-boundary";

export function LogContainer({
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

export type ComponentsRecord<T extends AnyRef = AnyRef> = Partial<{
  [K in AnyRef["ref"]]: T extends { ref: K }
    ? React.FC<{
        log: T;
        getLog: <Ref extends AnyRef>(
          arg: string | ((log: AnyRef) => boolean)
        ) => Ref | undefined;
      }>
    : never;
}>;

export const defaultComponents: ComponentsRecord = {
  thought: ({ log }) => {
    return (
      <LogContainer>
        <Collapsible>
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
            {log.ref}
            <CollapsibleTrigger>
              <Button variant="ghost" size="icon" className="w-7 h-7 -mr-2">
                <ChevronsUpDown />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {log.content && (
              <pre className="whitespace-pre-wrap break-all my-2 ">
                {log.content.trim()}
              </pre>
            )}
          </CollapsibleContent>
        </Collapsible>
      </LogContainer>
    );
  },
  input: ({ log }) => {
    const content = log.data?.content ?? log.content;
    return (
      <LogContainer>
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          User
        </div>
        {log.type === "message" && (
          <div className="whitespace-pre-wrap break-all my-2">
            {content.trim()}
          </div>
        )}
      </LogContainer>
    );
  },
  output: ({ log }) => {
    const content = log.data ?? log.content;
    return (
      <LogContainer>
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between pt-2">
          Agent
        </div>
        {log.type === "message" && (
          <div className="whitespace-pre-wrap break-all my-2">
            {content.trim()}
          </div>
        )}
      </LogContainer>
    );
  },
  // action_call: ({ log, getLog }) => {

  //   return (
  //     <LogContainer>
  //       <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
  //         System
  //       </div>
  //       {/* {log.type === "message" && (
  //         <div>{log.data?.content ?? log.content}</div>
  //       )} */}
  //     </LogContainer>
  //   );
  // },
};

export function LogsList({
  logs,
  components,
}: {
  logs: AnyRef[];
  components?: ComponentsRecord;
}) {
  console.log({ logs });
  // // Get show message settings from the store
  // const showThoughtMessages = useSettingsStore(
  //   (state) => state.showThoughtMessages
  // );

  // const showSystemMessages = useSettingsStore(
  //   (state) => state.showSystemMessages
  // );

  // Filter messages based on settings
  const filteredMessages = logs.filter((_log: any) => {
    // if (log.ref === "thought" && !showThoughtMessages) return false;
    // if (["input", "output"].includes(log.ref) && !showSystemMessages)
    //   return false;
    return true;
  });

  function getLog(arg: string | ((log: AnyRef) => boolean)) {
    return logs.find(typeof arg === "function" ? arg : (log) => log.id === arg);
  }

  const allComponents = {
    ...defaultComponents,
    ...components,
  };

  return (
    <div className="flex flex-col gap-4 md:max-w-3xl min-w-[40%]">
      {filteredMessages.map((log) => {
        const Component = allComponents[log.ref] as React.FC<{
          log: AnyRef;
          getLog: (id: string) => AnyRef | undefined;
        }>;

        return Component ? (
          <ErrorBoundary
            fallbackRender={() => {
              console.log({ log });
              return (
                <LogContainer>
                  <div>Error</div>
                  <div>{JSON.stringify(log)}</div>
                </LogContainer>
              );
            }}
          >
            <Component key={log.id} log={log} getLog={getLog} />
          </ErrorBoundary>
        ) : null;
      })}
    </div>
  );
}
