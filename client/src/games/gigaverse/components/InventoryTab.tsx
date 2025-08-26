import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { formatEther } from "viem";
import { usePriceStore } from "@/store/priceStore";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { InventoryModal } from "./InventoryModal";
import { logger } from "@/utils/logger";

interface InventoryTabProps {
  state: ContextState<GigaverseContext>;
}

export function InventoryTab({ state }: InventoryTabProps) {
  const { balances, gear, account } = state.options.game.player;
  const playerLevel = account.noob.LEVEL_CID;
  const [modalOpen, setModalOpen] = useState(false);

  const { exchangeRate } = usePriceStore();

  logger.debug("Gear inventory loaded", { gearCount: gear.length, gear });

  return (
    <>
      <div className="flex flex-col gap-4 mt-4">
        {/* Header with level */}
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-semibold uppercase">Inventory</h4>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium bg-primary/10 px-2 py-1 rounded">
              Level {playerLevel}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalOpen(true)}
              className="h-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Equipped Section */}
        <div className="border rounded-lg p-3 bg-muted/20">
          <h5 className="text-xs uppercase mb-2 text-muted-foreground">
            Equipped
          </h5>
          <div className="grid grid-cols-2 gap-2">
            {/* Head */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Head</span>
              <div className="relative aspect-square">
                {gear.head ? (
                  <img
                    src={gear.head.IMG_URL_CID}
                    className="w-full h-full object-cover rounded-md"
                    alt={gear.head.NAME_CID}
                  />
                ) : (
                  <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
              {gear.head && (
                <>
                  <div className="text-xs truncate">{gear.head.NAME_CID}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {gear.head.DESCRIPTION_CID}
                  </div>
                </>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Body</span>
              <div className="relative aspect-square">
                {gear.body ? (
                  <img
                    src={gear.body.IMG_URL_CID}
                    className="w-full h-full object-cover rounded-md"
                    alt={gear.body.NAME_CID}
                  />
                ) : (
                  <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                    Empty
                  </div>
                )}
              </div>
              {gear.body && (
                <>
                  <div className="text-xs truncate">{gear.body.NAME_CID}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {gear.body.DESCRIPTION_CID}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Full Inventory */}
        <div>
          <h5 className="text-xs uppercase mb-2 text-muted-foreground">
            Items
          </h5>
          <div className="grid grid-cols-4 gap-2">
            {balances.map(({ balance, item }) => {
              const itemData = state.options.game.offchain.gameItems.find(
                (entity) => entity.ID_CID === item.id
              );

              return (
                <div key={item.id} className="flex flex-col text-xs gap-1">
                  <div className="relative">
                    <img
                      src={itemData?.IMG_URL_CID}
                      className="w-full aspect-square object-cover rounded-md"
                    />
                    <div className="absolute top-1 left-1 bg-primary/20 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      {balance}
                    </div>
                    <div className="absolute bottom-1 right-1 bg-primary/20 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      {exchangeRate && (
                        <span className="text-xs">
                          $
                          {Number(
                            formatEther(BigInt(item.floorPrice * exchangeRate))
                          ).toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="truncate">
                    #{item.id} {item.name}
                  </div>
                  <div className="truncate text-muted-foreground">
                    {item.type}
                  </div>
                  <div className="truncate text-muted-foreground text-[10px]">
                    {itemData?.DESCRIPTION_CID}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <InventoryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        state={state}
      />
    </>
  );
}
