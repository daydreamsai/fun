import { Button } from "@/components/ui/button";
import { InferSchemaArguments } from "@daydreamsai/core";
import { useConnect } from "@starknet-react/core";

export function PonziLandSidebar({ args }: { args: { id: string } }) {
  const { connect, connectors } = useConnect();
  return (
    <div>
      <div>PonziLandSidebar {args.id}</div>
      <div>
        <Button onClick={() => connect({ connector: connectors[0] })}>
          Connect
        </Button>
      </div>
    </div>
  );
}
