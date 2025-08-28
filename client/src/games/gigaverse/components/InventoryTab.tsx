import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { formatEther } from "viem";
import { usePriceStore } from "@/store/priceStore";
import { logger } from "@/utils/logger";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventoryTabProps {
  state: ContextState<GigaverseContext>;
}

export function InventoryTab({ state }: InventoryTabProps) {
  const { balances, gear, account } = state.options.game.player;
  const playerLevel = account.noob.LEVEL_CID;

  const { exchangeRate } = usePriceStore();

  logger.debug("Gear inventory loaded", { gearCount: gear.length, gear });

  return (
    <div className="flex flex-col h-full">
      {/* Inventory content wrapper with flex-1 and ScrollArea */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 pr-4 pb-20">
            {/* Equipped Section */}
            <div>
              <h5 className="text-xs uppercase mb-2 text-muted-foreground">
                Equipped
              </h5>
              <div className="grid grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                {/* Head */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Head</span>
                  <div className="relative aspect-square w-16">
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
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">Body</span>
                  <div className="relative aspect-square w-16">
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

            {/* Items Section */}
            <div>
              <h5 className="text-xs uppercase mb-2 text-muted-foreground">
                Items
              </h5>
              <div className="grid grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                {balances.filter(({ balance }) => balance > 0).map(({ balance, item }) => {
                  const itemData = state.options.game.offchain.gameItems.find(
                    (entity) => entity.ID_CID === item.id
                  );

                  return (
                    <div key={item.id} className="flex flex-col items-center gap-1">
                      <div className="relative w-16 h-16">
                        <img
                          src={itemData?.IMG_URL_CID}
                          className="w-full h-full object-cover rounded-md border border-border/20"
                        />
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-xs font-medium min-w-[20px] text-center">
                          {balance}
                        </div>
                        {exchangeRate && (
                          <div className="absolute -bottom-1 -right-1 bg-secondary text-secondary-foreground px-1 py-0.5 rounded text-[10px] font-medium">
                            $
                            {Number(
                              formatEther(BigInt(item.floorPrice * exchangeRate))
                            ).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="text-center text-xs font-medium w-full">
                        <div className="truncate">{item.name}</div>
                        <div className="text-muted-foreground text-[10px] truncate">
                          {item.type}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
