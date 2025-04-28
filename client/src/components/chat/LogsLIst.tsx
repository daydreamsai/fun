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

export function LogContainer({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex">
      <div
        className={cn(
          "relative p-4 text-sm shadow-md transition-all duration-200 max-w-[90%] min-w-[40%] whitespace-pre-wrap break-words border-opacity-50",
          className
        )}
      >
        {children}
      </div>
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
      <LogContainer className="bg-card text-muted-foreground border hover:brightness-105">
        <Collapsible>
          <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
            {log.ref}
            <CollapsibleTrigger>
              <Button variant="ghost" size="sm">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            {log.content && <div className="text-base">{log.content}</div>}
          </CollapsibleContent>
        </Collapsible>
      </LogContainer>
    );
  },
  input: ({ log }) => {
    return (
      <LogContainer className="bg-card text-muted-foreground border hover:brightness-105">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
          User
        </div>
        {log.type === "message" && (
          <div>{log.data?.content ?? log.content}</div>
        )}
      </LogContainer>
    );
  },
  output: ({ log }) => {
    return (
      <LogContainer className="bg-card text-muted-foreground border hover:brightness-105">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider opacity-80 flex items-center justify-between">
          Agent
        </div>
        {log.type === "message" && <div>{log.data ?? log.content}</div>}
      </LogContainer>
    );
  },
  // action_call: ({ log, getLog }) => {

  //   return (
  //     <LogContainer className="bg-card text-muted-foreground border hover:brightness-105">
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
    <div className="flex flex-col space-y-2 w-full">
      {filteredMessages.map((log) => {
        const Component = allComponents[log.ref] as React.FC<{
          log: AnyRef;
          getLog: (id: string) => AnyRef | undefined;
        }>;

        return Component ? (
          <Component key={log.id} log={log} getLog={getLog} />
        ) : null;
      })}
    </div>
  );
}
