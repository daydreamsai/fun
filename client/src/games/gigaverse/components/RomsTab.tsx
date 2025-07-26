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
    onSettled(_, __, { romId, claimId }) {
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
    <div className="grid gap-2 px-2">
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
          <Card key={rom._id} className="bg-card/80 border p-3">
            <div className="flex items-center">
              <h3 className="font-semibold uppercase">
                GIGA-ROM #{rom.docId}{" "}
              </h3>
              <Badge variant="secondary" className="ml-auto">
                {rom.factoryStats.faction}
              </Badge>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>{rom.factoryStats.tier}</span>
              <span>{rom.factoryStats.memory}</span>
              <span>#{rom.factoryStats.serialNumber}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
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

const colors = {
  energy: "bg-accent",
  dust: "bg-accent",
  shard: "bg-primary",
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
    <div className="flex flex-col text-center">
      {/* <div className="">{type}</div> */}
      <div className="flex items-center justify-center space-x-2 bg-muted p-1 rounded border border-border mb-1">
        <div className={cn("w-4 h-4 rounded-full", colors[type])}></div>
        <span className="text-xs font-medium tracking-wide">
          {value?.toFixed(0)}/{""}
          {max}
        </span>
      </div>
      <Button
        variant={isClaiming ? "secondary" : "default"}
        size="sm"
        className="w-full text-xs h-6"
        disabled={isClaiming || value < 1}
        onClick={() => claim()}
      >
        {isClaiming ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : value >= 1 ? (
          "Claim"
        ) : (
          "Producing"
        )}
      </Button>
    </div>
  );
}
