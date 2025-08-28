import { useState } from "react";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GameClient } from "../client/GameClient";

// const _address = "0xE9b489ff145ac7d8ECA36C3b5c29E1be7f2281B9";

export function RomsTab({
  address,
  gameClient,
}: {
  address: string;
  gameClient: GameClient;
}) {
  const [claimingStatus, setClaimingStatus] = useState<Record<string, boolean>>(
    {}
  );

  const romsQuery = useQuery({
    enabled: !!address,
    queryKey: ["gigaverse:roms", address],
    queryFn: async () => {
      const roms = await gameClient.getUserRoms(address);
      return roms;
    },
  });

  const claimEnergyMutation = useMutation({
    mutationFn: async ({
      romId,
      claimId,
    }: {
      romId: string;
      claimId: string;
    }) => {
      const response = await gameClient.claimEnergy({
        romId,
        claimId,
      });
      return response;
    },
    onMutate({ romId, claimId }) {
      const statusKey = `${romId}-${claimId}`;
      setClaimingStatus((state) => ({ ...state, [statusKey]: true }));
    },
    onSuccess(_, { romId, claimId }) {
      // Keep the spinner going and wait before refetching
      setTimeout(() => {
        const statusKey = `${romId}-${claimId}`;
        setClaimingStatus((state) => ({ ...state, [statusKey]: false }));
        romsQuery.refetch();
      }, 2000);
    },
    onError(_, { romId, claimId }) {
      // Stop spinner immediately on error
      const statusKey = `${romId}-${claimId}`;
      setClaimingStatus((state) => ({ ...state, [statusKey]: false }));
    },
  });

  if (romsQuery.isLoading)
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        Loading ROMs...
      </p>
    );

  const roms = romsQuery.data?.entities ?? [];

  if (roms.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No ROMs found for this address.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {roms.map((rom) => {
        // Calculate loading states for this ROM's buttons
        const isClaimingEnergy = claimingStatus[`${rom.docId}-energy`] || false;
        const isClaimingShard = claimingStatus[`${rom.docId}-shard`] || false;
        const isClaimingDust = claimingStatus[`${rom.docId}-dust`] || false;

        // Calculate available resources based on production rates and time
        const calculatedEnergy = Math.min(
          rom.factoryStats.percentageOfAWeekSinceLastEnergyClaim *
            rom.factoryStats.maxEnergy,
          rom.factoryStats.maxEnergy
        );

        const calculatedShard = Math.min(
          rom.factoryStats.percentageOfAWeekSinceLastShardClaim *
            rom.factoryStats.shardProductionPerWeek,
          rom.factoryStats.maxShard
        );

        const calculatedDust = Math.min(
          rom.factoryStats.percentageOfAWeekSinceLastDustClaim *
            rom.factoryStats.dustProductionPerWeek,
          rom.factoryStats.maxDust
        );

        return (
          <Card key={rom._id} className="bg-card p-3 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">
                ROM #{rom.docId}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {rom.factoryStats.faction}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-3 space-x-2">
              <span>{rom.factoryStats.tier}</span>
              <span>{rom.factoryStats.memory}</span>
              <span>#{rom.factoryStats.serialNumber}</span>
            </div>

            <div className="space-y-2">
              <Production
                type="energy"
                value={calculatedEnergy}
                max={rom.factoryStats.maxEnergy}
                claim={() => {
                  claimEnergyMutation.mutate({
                    romId: rom.docId,
                    claimId: "energy",
                  });
                }}
                isClaiming={isClaimingEnergy}
              />

              <Production
                type="dust"
                value={Math.floor(calculatedDust)}
                max={rom.factoryStats.maxDust}
                claim={() => {
                  claimEnergyMutation.mutate({
                    romId: rom.docId,
                    claimId: "dust",
                  });
                }}
                isClaiming={isClaimingDust}
              />
              <Production
                type="shard"
                value={Math.floor(calculatedShard)}
                max={rom.factoryStats.maxShard}
                claim={() => {
                  claimEnergyMutation.mutate({
                    romId: rom.docId,
                    claimId: "shard",
                  });
                }}
                isClaiming={isClaimingShard}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

const getCircleColor = (type: string, value: number) => {
  if (value >= 1) {
    return "bg-primary";
  }
  return "bg-accent";
};

function Production({
  value,
  max,
  isClaiming,
  type,
  claim,
}: {
  value: number;
  max: number;
  isClaiming: boolean;
  type: "energy" | "dust" | "shard";
  claim: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
      <div className="flex items-center gap-2">
        <div className={cn("w-3 h-3 rounded-full", getCircleColor(type, value))}></div>
        <span className="text-xs font-medium capitalize">{type}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs">
          {value?.toFixed(0)}/{max}
        </span>
        <div className="ml-3">
          {(value >= 1 || isClaiming) && (
            <Button
              variant={isClaiming ? "secondary" : "default"}
              size="sm"
              className="text-xs h-6 px-2"
              disabled={isClaiming}
              onClick={() => claim()}
            >
              {isClaiming ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Claim"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
