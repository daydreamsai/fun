// path: src/client/types/game.ts

import { GetAccountResponse, GetStaticResponse } from "../GameClient";
import {
  GetAllGameItemsResponse,
  GetEnergyResponse,
  GetAllSkillsResponse,
  GetFactionResponse,
  GetSkillsProgressResponse,
  GetTodayResponse,
  GetGigaJuiceResponse,
  GetFishingStateResponse,
} from "./responses";

/**
 * Type definitions for players, runs, equipment, items, etc.
 */

export interface PlayerStats {
  startingATK: number;
  startingDEF: number;
  currentATK: number;
  currentDEF: number;
  currentCharges: number;
  maxCharges: number;
}

export interface Health {
  current: number;
  starting: number;
  currentMax: number;
  startingMax: number;
}

export interface Shield {
  current: number;
  starting: number;
  currentMax: number;
  startingMax: number;
}

export interface Equipment {
  docId: string;
  RARITY_CID: number;
  UINT256_CID: number;
  UINT256_CID_array: (number | null)[];
  selectedVal1: number;
  selectedVal2: number;
  boonTypeString: string;
}

export interface Player {
  id: string;
  rock: PlayerStats;
  paper: PlayerStats;
  scissor: PlayerStats;
  health: Health;
  shield: Shield;
  equipment: Equipment[];
  lastMove: string;
  thisPlayerWin: boolean;
  otherPlayerWin: boolean;
  _id: string;
}

export interface LootOption {
  docId: string;
  RARITY_CID: number;
  UINT256_CID: number;
  UINT256_CID_array: (number | null)[];
  selectedVal1: number;
  selectedVal2: number;
  boonTypeString: string;
}

export interface DungeonData {
  run: RunData | null;
  entity: Entity | null;
}

export interface RunData {
  _id: string;
  DUNGEON_ID_CID: number;
  userId: string;
  players: Player[];
  lootPhase: boolean;
  version: number;
  lootOptions: LootOption[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Entity {
  _id: string;
  docId: string;
  COMPLETE_CID: boolean;
  LEVEL_CID: number;
  GAME_ITEM_ID_CID_array: any[];
  ID_CID: string;
  PLAYER_CID: string;
  ROOM_NUM_CID: number;
  NOOB_TOKEN_CID: number;
  DUNGEON_ID_CID: number;
  ENEMY_CID: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GameItemBalanceChange {
  id: number;
  amount: number;
}

export interface GameItemEntity {
  docId: string;
  tableName: string;
  NAME_CID: string;
  createdAt: string;
  updatedAt: string;
  MAX_SUPPLY_CID?: number;
  MINT_COUNT_CID?: number;
  BURN_COUNT_CID?: number;
  IS_SOULBOUND_CID?: boolean;
  OWNER_CID?: string;
  ID_CID?: string;
  ADDRESS_CID?: string;
  CONTRACT_URI_CID?: string;
  BASE_URI_CID?: string;
}

export interface EnemyEntity {
  docId: string;
  ID_CID: string;
  EQUIPMENT_HEAD_CID: number;
  EQUIPMENT_BODY_CID: number;
  NAME_CID: string;
  LOOT_ID_CID: number;
  MOVE_STATS_CID_array: number[];
}

// Define an interface for the state (template removed)
export interface GigaverseDungeonState {
  currentDungeon: number;
  currentRoom: number;
  currentEnemy: number;

  player: Player;
  items: number[];

  enemy: Player;

  lootPhase: boolean;
  lootOptions: any[];

  lastBattleResult: string | null;
}

export type ItemBalance = {
  item: {
    id: number;
    name: string;
    description: string;
    type: string;
    floorPrice: number;
    img: string;
  };
  balance: number;
};

export type GigaverseState = {
  energy: GetEnergyResponse;
  juice: GetGigaJuiceResponse;
  consumables: ItemBalance[];
  balances: ItemBalance[];
  dungeon: GigaverseDungeonState | undefined;
  lastUpdate?: number;
  fishingState: GetFishingStateResponse;
};

export type GameData = {
  items: GetAllGameItemsResponse;
  skills: GetAllSkillsResponse;
  offchain: GetStaticResponse;
  player: {
    account: GetAccountResponse;
    faction: GetFactionResponse;
    skills: GetSkillsProgressResponse;
    balances: ItemBalance[];
    consumables: ItemBalance[];
  };
  today: GetTodayResponse;
  marketplaceFloor: MarketplaceFloorResponse;
};

export type MarketplaceFloorResponse = {
  entities: {
    GAME_ITEM_ID_CID: number;
    ETH_MINT_PRICE_CID: number;
  }[];
};

export type MarketplaceItemListingResponse = {
  entities: {
    _id: string;
    docId: string;
    tableName: string;
    firstTx: string;
    lastTx: string;
    EXPORT_AMOUNT_CID: number;
    createdAt: string;
    updatedAt: string;
    OWNER_CID: string;
    ID_CID: string;
    UINT256_CID: number;
    TIMESTAMP_CID: number;
    ETH_MINT_PRICE_CID: number;
    GAME_ITEM_ID_CID: number;
  }[];
};

type FishingCardEffect = {
  type: "FISH_HP";
  amount: number;
};

export type FishingCard = {
  id: number;
  startingAmount: number;
  manaCost: number;
  hitZones: number[];
  critZones: number[];
  hitEffects: FishingCardEffect[];
  missEffects: FishingCardEffect[];
  critEffects: FishingCardEffect[];
  unlockLevel: number;
  rarity: number;
  isDayCard: boolean;
  earnable: boolean;
};

export type FishingCardsResponse = {
  entities: FishingCard[];
};

export type FishingActionStartRun = {
  action: "start_run" | "play_cards";
  actionToken: string | number;
  data: {
    cards: number[];
    nodeId: string;
  };
};

export type FishingActionData = {
  deckCardData: FishingCard[];
  playerMaxHp: number;
  playerHp: number;
  fishHp: number;
  fishMaxHp: number;
  fishPosition: number[];
  previousFishPosition: number[];
  fullDeck: number[];
  nextCardIndex: number;
  cardInDrawPile: number;
  hand: number[];
  discard: number[];
  jebaitorTriggered: boolean;
  day: number;
  week: number;
  caughtFish: {
    gameItemId: number;
    name: string;
    rarity: number;
    size: string;
    startDate: string | null;
    endDate: string | null;
    moveDistances: number[];
    levelRequired: number;
    quality: number;
    sizes: {
      weight: number;
      length: number;
      girth: number;
    };
    plusOneRarity: boolean;
    plusOneQuality: boolean;
    doubled: boolean;
    findexResult: {
      newFish: boolean;
      newLength: boolean;
      newGirth: boolean;
      newWeight: boolean;
      newQuality: boolean;
      totalCaught: number;
    };
    seaweedEarned: number;
  };
  cardsToAdd: FishingCard[];
};

export interface FisingResponseData {
  doc: {
    _id: string;
    docId: string;
    docType: string;
    data: FishingActionData;
    COMPLETE_CID: boolean;
    LEVEL_CID: number;
    ID_CID: string;
    PLAYER_CID: string;
    DAY_CID: number;
    createdAt: string;
    updatedAt: string;
    __v: number;
    SUCCESS_CID: boolean;
  };
  events: Array<{
    type: string;
    value: number;
    playerId: number;
    batch: number;
    data: any;
  }>;
}

export type FishingItemBalanceChanges = Array<{
  id: number;
  amount: number;
  gearInstanceId: string;
  rarity: number;
}>;

export type FishingActionPlayCardsResponse = {
  success: boolean;
  message: string;
  data: FisingResponseData;
  gameItemBalanceChanges: FishingItemBalanceChanges;
  actionToken: number;
};
