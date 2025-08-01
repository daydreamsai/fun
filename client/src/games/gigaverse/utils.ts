import { EquipedGearResponse, OffchainItems } from "./client/GameClient";
import {
  GameData,
  GameItemBalanceChange,
  ItemBalance,
  MarketplaceFloorResponse,
} from "./client/types/game";
import { GigaverseDungeonState } from "./client/types/game";
import {
  BaseResponse,
  GetConsumablesResponse,
  GetBalancesResponse,
} from "./client/types/responses";

export function parseDungeonState(
  response: BaseResponse
): GigaverseDungeonState | undefined {
  if (!response.data?.run || !response.data?.entity) return undefined;

  const [player, enemy] = response.data.run.players; // First player is the user

  let lastBattleResult: any = null;

  // Determine battle result based on thisPlayerWin and otherPlayerWin properties
  if (player.thisPlayerWin === true) {
    lastBattleResult = "win";
  } else if (enemy.thisPlayerWin === true) {
    lastBattleResult = "lose";
  } else if (enemy.lastMove) {
    lastBattleResult = "draw";
  }

  return {
    currentRoom: response.data.entity.ROOM_NUM_CID,
    currentDungeon: response.data.entity.DUNGEON_ID_CID,
    currentEnemy: response.data.entity.ENEMY_CID,

    player,

    items: response.data.entity.GAME_ITEM_ID_CID_array,

    enemy,

    lastBattleResult,

    lootOptions: response.data.run.lootOptions,
    lootPhase: response.data.run.lootPhase,
  };
}

export function parseItems(
  consumables: GetConsumablesResponse | GetBalancesResponse,
  items: GameData["items"],
  offchain: GameData["offchain"],
  marketplaceFloor: MarketplaceFloorResponse,
  consumable: boolean = false
): ItemBalance[] {
  return consumables.entities
    .map((entity) => {
      const { docId, NAME_CID } = items.entities.find(
        (item) => item.docId === entity.ID_CID
      )!;
      const { DESCRIPTION_CID, TYPE_CID, ICON_URL_CID } =
        offchain.gameItems.find((item) => item.docId === entity.ID_CID)!;

      const floorPrice = marketplaceFloor.entities.find(
        (item) => item.GAME_ITEM_ID_CID === parseInt(docId)
      )?.ETH_MINT_PRICE_CID;

      return {
        item: {
          id: parseInt(docId),
          name: NAME_CID,
          description: DESCRIPTION_CID,
          type: TYPE_CID,
          floorPrice: floorPrice ?? 0,
          img: ICON_URL_CID,
        },
        balance: entity.BALANCE_CID,
      };
    })
    .filter((item) => {
      if (consumable) {
        // Only include items where type is "Consumable" (case-insensitive)
        return (
          typeof item.item.type === "string" &&
          item.item.type.toLowerCase() === "consumable"
        );
      }
      return true;
    });
}

export function perc(current: number, max: number) {
  return current && max ? (current / max) * 100 : 0;
}

// parse equiped gear
export function parseEquipedGear(
  equipedGear: EquipedGearResponse,
  offchain: GameData["offchain"]
): {
  head: OffchainItems | undefined;
  body: OffchainItems | undefined;
} {
  const head =
    offchain.gameItems.find(
      (item) =>
        item.docId === equipedGear.entities[0].EQUIPMENT_HEAD_CID.toString()
    ) ?? undefined;
  const body =
    offchain.gameItems.find(
      (item) =>
        item.docId === equipedGear.entities[0].EQUIPMENT_BODY_CID.toString()
    ) ?? undefined;

  return {
    head,
    body,
  };
}

export const parseBalanceChange = (
  balanceChanges: GameItemBalanceChange[],
  offchain: GameData["offchain"],
  marketplaceFloor: MarketplaceFloorResponse
): ItemBalance[] => {
  return balanceChanges.map((balanceChange) => {
    const itemData = offchain.gameItems.find(
      (item) => item.docId === balanceChange.id.toString()
    );

    const floorPrice = marketplaceFloor.entities.find(
      (item) => item.GAME_ITEM_ID_CID === parseInt(itemData?.docId ?? "0")
    )?.ETH_MINT_PRICE_CID;

    return {
      item: {
        id: parseInt(itemData?.docId ?? "0"),
        name: itemData?.NAME_CID ?? "",
        description: itemData?.DESCRIPTION_CID ?? "",
        type: itemData?.TYPE_CID ?? "",
        floorPrice: floorPrice ?? 0,
        img: itemData?.ICON_URL_CID ?? "",
      },
      balance: balanceChange.amount,
    };
  });
};
