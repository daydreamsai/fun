import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";

interface InventoryTabProps {
  state: ContextState<GigaverseContext>;
}

export function InventoryTab({ state }: InventoryTabProps) {
  return (
    <div className="grid grid-cols-4 gap-2 gap-y-3 mt-4">
      {state.memory.balances.map(({ balance, item }) => {
        const itemData = state.options.game.offchain.gameItems.find(
          (entity) => entity.ID_CID === item.id
        );

        return (
          <div key={item.id} className="flex flex-col text-xs gap-1">
            <img src={itemData?.IMG_URL_CID}></img>
            <div className="truncate">
              #{item.id} {item.name}
            </div>
            <div className="truncate">{item.type}</div>
            <div className="">{balance}</div>
          </div>
        );
      })}
    </div>
  );
}
