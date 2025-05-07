import { useState } from "react";
import { AnyAgent, InferSchemaArguments } from "@daydreamsai/core";
import { Eye, EyeOff, Code, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GigaverseContext, gigaverseContext } from "../context";
import { browserStorage } from "@/agent";
import { useWorkingMemory } from "@/hooks/agent";

export function MemoryTab({
  agent,
  args,
}: {
  agent: AnyAgent;
  args: InferSchemaArguments<GigaverseContext["schema"]>;
}) {
  const [showFullMemory, setShowFullMemory] = useState(false);

  const contextId = agent.getContextId({
    context: gigaverseContext,
    args,
  });

  const workingMemory = useWorkingMemory({
    agent,
    context: gigaverseContext,
    args,
  });

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">Working Memory</h4>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFullMemory(!showFullMemory)}
            title={showFullMemory ? "Hide Details" : "Show Details"}
          >
            {showFullMemory ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              browserStorage().delete("working-memory:goal:1");
              browserStorage().delete("memory:goal:1");
              browserStorage().delete("context:goal:1");
            }}
          >
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <Card className="p-3 flex-1 overflow-auto mb-2">
        {workingMemory ? (
          <pre className="text-xs whitespace-pre-wrap break-all">
            {showFullMemory
              ? JSON.stringify(workingMemory.data, null, 2)
              : JSON.stringify(
                  {
                    logs: workingMemory.data?.length || 0,
                    // context: workingMemory.context
                    //   ? Object.keys(workingMemory.context)
                    //   : "N/A",
                    // logs: workingMemory.data,
                  },
                  null,
                  2
                )}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">Loading memory...</p>
        )}
      </Card>

      <div className="pb-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(
              JSON.stringify(workingMemory, null, 2)
            );
          }}
          title="Copy Memory JSON"
        >
          <Code className="h-3 w-3 mr-1" />
          Copy JSON
        </Button>
      </div>

      <Card className="p-3 mb-3">
        <h4 className="text-sm font-medium mb-1">Message Count</h4>
        <p className="text-xs">{workingMemory.data.length}</p>
      </Card>

      <Card className="p-3 mb-3">
        <h4 className="text-sm font-medium mb-1">Agent Status</h4>
        <div className="text-xs flex items-center">
          {workingMemory.isLoading ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
              <span className="text-green-600 dark:text-green-400 font-medium">
                Active - Processing
              </span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
              <span>Idle - Ready</span>
            </>
          )}
        </div>
      </Card>

      <Card className="p-3 mb-3">
        <h4 className="text-sm font-medium mb-1">Message Types</h4>
        <div className="text-xs">
          <p>
            User:{" "}
            {workingMemory.data.filter((m: any) => m.ref === "input").length}
          </p>
          <p>
            Agent:{" "}
            {workingMemory.data.filter((m: any) => m.ref === "output").length}
          </p>
          <p>
            System:{" "}
            {
              workingMemory.data.filter(
                (m: any) => !(m.ref === "input" || m.ref === "output")
              ).length
            }
          </p>
        </div>
      </Card>

      <Card className="p-3 mb-3">
        <h4 className="text-sm font-medium mb-1">Working Memory</h4>
        <div className="text-xs">
          <p>Size: {(workingMemory.data.length / 1024).toFixed(2)} KB</p>
          <p>Last Updated: {workingMemory.dataUpdatedAt}</p>
        </div>
      </Card>

      <Card className="p-3">
        <h4 className="text-sm font-medium mb-1">Chat Info</h4>
        <div className="text-xs">
          <p>Chat ID: {contextId.split(":").pop()}</p>
          <p>Started: {new Date().toLocaleDateString()}</p>
        </div>
      </Card>
    </>
  );
}
