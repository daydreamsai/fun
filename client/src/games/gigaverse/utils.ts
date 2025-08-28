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
import { logger } from "@/utils/logger";

export function parseDungeonState(
  response: BaseResponse
): GigaverseDungeonState | undefined {
  logger.debug("Parsing dungeon state", {
    hasResponse: !!response,
    hasData: !!response?.data,
    hasRun: !!response?.data?.run,
    hasEntity: !!response?.data?.entity
  });

  if (!response) {
    logger.debug("No response object received");
    return undefined;
  }

  if (!response.data) {
    logger.debug("No response.data found");
    return undefined;
  }

  // Check if we have basic dungeon info even without run data
  if (!response.data.entity) {
    logger.debug("No response.data.entity found");
    return undefined;
  }

  // If we have entity but no run, create a minimal state
  if (!response.data.run) {
    logger.warn("No run data found, creating minimal state");
    return {
      currentRoom: response.data.entity.ROOM_NUM_CID || 1,
      currentDungeon: response.data.entity.DUNGEON_ID_CID || 1,
      currentEnemy: response.data.entity.ENEMY_CID || 1,
      
      // Create minimal player state
      player: {
        id: "minimal",
        _id: "minimal",
        health: { 
          current: 1, 
          starting: 1, 
          currentMax: 1, 
          startingMax: 1 
        },
        shield: { 
          current: 0, 
          starting: 0, 
          currentMax: 0, 
          startingMax: 0 
        },
        lastMove: "",
        rock: { 
          startingATK: 1, 
          startingDEF: 1, 
          currentATK: 1, 
          currentDEF: 1, 
          currentCharges: 3, 
          maxCharges: 3 
        },
        paper: { 
          startingATK: 1, 
          startingDEF: 1, 
          currentATK: 1, 
          currentDEF: 1, 
          currentCharges: 3, 
          maxCharges: 3 
        },
        scissor: { 
          startingATK: 1, 
          startingDEF: 1, 
          currentATK: 1, 
          currentDEF: 1, 
          currentCharges: 3, 
          maxCharges: 3 
        },
        thisPlayerWin: false,
        otherPlayerWin: false,
        equipment: [],
      },
      
      items: response.data.entity.GAME_ITEM_ID_CID_array || [],
      
      // Create minimal enemy state  
      enemy: {
        id: "minimal",
        _id: "minimal",
        health: { 
          current: 1, 
          starting: 1, 
          currentMax: 1, 
          startingMax: 1 
        },
        shield: { 
          current: 0, 
          starting: 0, 
          currentMax: 0, 
          startingMax: 0 
        },
        lastMove: "",
        rock: { 
          startingATK: 1, 
          startingDEF: 1, 
          currentATK: 1, 
          currentDEF: 1, 
          currentCharges: 3, 
          maxCharges: 3 
        },
        paper: { 
          startingATK: 1, 
          startingDEF: 1, 
          currentATK: 1, 
          currentDEF: 1, 
          currentCharges: 3, 
          maxCharges: 3 
        },
        scissor: { 
          startingATK: 1, 
          startingDEF: 1, 
          currentATK: 1, 
          currentDEF: 1, 
          currentCharges: 3, 
          maxCharges: 3 
        },
        thisPlayerWin: false,
        otherPlayerWin: false,
        equipment: [],
      },
      
      lastBattleResult: null,
      lootOptions: [],
      lootPhase: false,
    };
  }

  const [player, enemy] = response.data.run.players; // First player is the user

  let lastBattleResult: string | null = null;

  // Determine battle result based on thisPlayerWin and otherPlayerWin properties
  if (player?.thisPlayerWin === true) {
    lastBattleResult = "win";
  } else if (enemy?.thisPlayerWin === true) {
    lastBattleResult = "lose";
  } else if (enemy?.lastMove) {
    lastBattleResult = "draw";
  }

  const dungeonState = {
    currentRoom: response.data.entity.ROOM_NUM_CID,
    currentDungeon: response.data.entity.DUNGEON_ID_CID,
    currentEnemy: response.data.entity.ENEMY_CID,

    player,

    items: response.data.entity.GAME_ITEM_ID_CID_array,

    enemy,

    lastBattleResult,

    lootOptions: response.data.run.lootOptions || [],
    lootPhase: response.data.run.lootPhase || false,
  };

  logger.debug("Successfully parsed dungeon state", {
    currentRoom: dungeonState.currentRoom,
    currentDungeon: dungeonState.currentDungeon,
    playerHealth: dungeonState.player?.health?.current,
    enemyHealth: dungeonState.enemy?.health?.current
  });

  return dungeonState;
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
