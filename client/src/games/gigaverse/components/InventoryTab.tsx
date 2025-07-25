import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { formatEther } from "viem";
import { usePriceStore } from "@/store/priceStore";

interface InventoryTabProps {
  state: ContextState<GigaverseContext>;
}

export function InventoryTab({ state }: InventoryTabProps) {
  const { balances } = state.options.game.player;

  const { exchangeRate } = usePriceStore();

  return (
    <div className="grid grid-cols-4 gap-2 gap-y-3 mt-4">
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
            <div className="truncate text-muted-foreground">{item.type}</div>
          </div>
        );
      })}
    </div>
  );
}
