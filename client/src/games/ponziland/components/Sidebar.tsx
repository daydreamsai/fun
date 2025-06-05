import { useEffect } from "react";
import { InferSchemaArguments } from "@daydreamsai/core";
import { Trash, ShieldQuestion, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ponzilandContext } from "../context";
import { useContextState } from "@/hooks/agent";
import { useSettingsStore } from "@/store/settingsStore";
import { useAgentStore } from "@/store/agentStore";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorComponent, Link } from "@tanstack/react-router";
import { useStarknetLogin } from "@/hooks/starknet-provider";
import { useAccount } from "@starknet-react/core";
import { useState } from "react";
import { type TokenPrice } from "../client/ponziland_api";
import { type Auction } from "../client/querys";

type PonzilandContext = typeof ponzilandContext;

// Types from the context data structure
interface TokenBalance {
  name: string;
  balance: bigint;
  approved: bigint;
  address: string;
}

interface Land {
  location: number;
  sell_price: bigint;
  token_used: string;
  owner: string;
}

interface LandData {
  lands: Land[];
  nuke_time: unknown[];
  yields: bigint[];
}

interface Claim {
  amount: bigint;
  can_be_nuked: boolean;
  land_location: bigint;
  token_address: string;
}

interface PonzilandContextData {
  tokens: TokenPrice[];
  balance: TokenBalance[];
  auctions: Auction[];
  land: LandData;
  claims: Claim[];
}

// Simple table component
const SimpleTable = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}) => (
  <div className="border rounded-md">
    <table className="w-full">
      <thead className="border-b bg-muted/50">
        <tr>
          {headers.map((header, i) => (
            <th key={i} className="text-left p-1 text-xs font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b last:border-0">
            {row.map((cell, j) => (
              <td key={j} className="p-1 text-xs">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export function PonziLandSidebar({
  args,
}: {
  args: InferSchemaArguments<PonzilandContext["schema"]>;
}) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { account } = useAccount();
  const { cartridgeAccount } = useSettingsStore((state) => state);
  const { mutate: login } = useStarknetLogin();

  const agent = useAgentStore((state) => state.agent);
  const contextId = agent.getContextId({ context: ponzilandContext, args });

  const ponzilandState = useContextState({
    agent,
    context: ponzilandContext,
    args,
  });

  useEffect(() => {
    return agent.subscribeContext(contextId, (log, done) => {
      if (!done) return;
      switch (log.ref) {
        case "step": {
          ponzilandState.refetch();
          break;
        }
        case "action_result": {
          if (log.name.startsWith("ponziland")) {
            ponzilandState.refetch();
          }
          break;
        }
      }
    });
  }, [contextId]);

  const queryClient = useQueryClient();

  const setShowHelpWindow = useSettingsStore(
    (state) => state.setShowHelpWindow
  );

  if (!account || !cartridgeAccount) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Connect to Ponziland</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => login()} className="w-full">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Properly typed context data
  const contextData = ponzilandState.data?.memory as PonzilandContextData;

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 p-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          onClick={() => setShowHelpWindow(true)}
        >
          <ShieldQuestion className="w-4 h-4" />
          Help
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          asChild
        >
          <Link to="/settings">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground"
          onClick={async () => {
            await agent.deleteContext(contextId);
            await queryClient.invalidateQueries({
              type: "active",
              exact: false,
              predicate(query) {
                try {
                  return query.queryKey[1] === contextId;
                } catch (error) {
                  return false;
                }
              },
            });
          }}
        >
          <Trash className="w-4 h-4" />
          Clear
        </Button>
      </div>

      <img
        src="/ponziland-banner.png"
        alt="Ponziland Banner"
        className="border-b w-full h-32 object-cover flex-shrink-0"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      {ponzilandState.error ? (
        <div className="p-2 border border-red-700 m-2 flex-shrink-0">
          <ErrorComponent error={ponzilandState.error} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Overview Section */}
          {contextData && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Portfolio Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total Tokens</p>
                    <p className="font-bold">
                      {contextData.tokens?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active Auctions</p>
                    <p className="font-bold">
                      {contextData.auctions?.filter(
                        (auction) => !auction.is_finished
                      ).length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Owned Lands</p>
                    <p className="font-bold">
                      {contextData.land?.lands?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending Claims</p>
                    <p className="font-bold">
                      {contextData.claims?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token Balances Section */}
          {contextData?.balance && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Token Balances</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <SimpleTable
                  headers={["Token", "Balance", "Approved"]}
                  rows={contextData.balance.map((token: TokenBalance) => [
                    token.name,
                    Number(token.balance).toFixed(2),
                    Number(token.approved).toFixed(2),
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {/* Owned Lands Section */}
          {contextData?.land?.lands && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Owned Lands</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <SimpleTable
                  headers={["Location", "Sell Price", "Token", "Yield"]}
                  rows={contextData.land.lands.map(
                    (land: Land, index: number) => {
                      // Find token symbol from address
                      const token = contextData.tokens?.find(
                        (t) => t.address === land.token_used
                      );
                      const tokenSymbol =
                        token?.symbol || land.token_used.slice(0, 8) + "...";

                      return [
                        land.location,
                        (Number(land.sell_price) / 10 ** 18).toFixed(2),
                        tokenSymbol,
                        (
                          Number(contextData.land.yields?.[index] || 0) /
                          10 ** 18
                        ).toFixed(2),
                      ];
                    }
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Auctions Section */}
          {contextData?.auctions && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Active Auctions</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <SimpleTable
                  headers={[
                    "Location",
                    "Current",
                    "Floor",
                    "Start",
                    "Decay",
                    "Status",
                  ]}
                  rows={contextData.auctions.map((auction: Auction) => [
                    auction.land_location,
                    auction.current_price.toString(),
                    (Number(auction.floor_price) / 10 ** 18).toFixed(2),
                    (Number(auction.start_price) / 10 ** 18).toFixed(2),
                    auction.decay_rate,
                    <Badge
                      key={auction.land_location}
                      variant={auction.is_finished ? "secondary" : "default"}
                      className="text-xs px-1 py-0"
                    >
                      {auction.is_finished ? "Done" : "Live"}
                    </Badge>,
                  ])}
                />
              </CardContent>
            </Card>
          )}

          {/* Claims Section */}
          {contextData?.claims && contextData.claims.length > 0 && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Pending Claims</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <SimpleTable
                  headers={["Location", "Amount", "Token", "Status"]}
                  rows={contextData.claims.map((claim: Claim) => [
                    claim.land_location.toString(),
                    (Number(claim.amount) / 10 ** 18).toFixed(2),
                    <span
                      key={claim.land_location.toString()}
                      title={claim.token_address}
                      className="truncate max-w-20"
                    >
                      {claim.token_address.slice(0, 8)}...
                    </span>,
                    <Badge
                      key={`${claim.land_location}-status`}
                      variant={claim.can_be_nuked ? "destructive" : "default"}
                      className="text-xs px-1 py-0"
                    >
                      {claim.can_be_nuked ? "Can Nuke" : "Safe"}
                    </Badge>,
                  ])}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
