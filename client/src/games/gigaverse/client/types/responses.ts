// path: src/client/types/responses.ts

/**
 * Response objects for each endpoint: run data, items, enemies, etc.
 */

import {
  GameItemBalanceChange,
  GameItemEntity,
  EnemyEntity,
  DungeonData,
} from "./game";

export interface BaseResponse<Data extends any = DungeonData> {
  success: boolean;
  message: string;
  data?: Data;
  actionToken?: string | number;
  gameItemBalanceChanges?: GameItemBalanceChange[];
}

export interface EquipEntity {
  _id: string;
  docId: string;
  CONSUMABLES_CID: any[];
  EQUIPMENT_BODY_CID: number;
  EQUIPMENT_HEAD_CID: number;
  createdAt: string;
  updatedAt: string;
}

export interface EquipResponse {
  success: boolean;
  message: string;
  data: EquipEntity[];
}

export interface ClaimEnergyResponse {
  success: boolean;
}

export interface GetUserRomsResponse {
  entities: RomEntity[];
}

export interface RomEntity {
  _id: string;
  docId: string;
  tableName: string;
  tableId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  OWNER_CID: string;
  LAST_TRANSFER_TIME_CID?: number;
  INITIALIZED_CID: boolean;
  factoryStats: {
    tier: string;
    memory: string;
    faction: string;
    serialNumber: string;
    shardProductionPerWeek: number;
    dustProductionPerWeek: number;
    maxEnergy: number;
    maxShard: number;
    maxDust: number;
    dustItemId: number;
    shardItemId: number;
    timeSinceLastTransfer: number;
    secondsSinceEpoch: number;
    secondsSinceLastEnergyClaim: number;
    secondsSinceLastShardClaim: number;
    secondsSinceLastDustClaim: number;
    timeSinceLastCollectEnergy: number;
    timeSinceLastCollectShard: number;
    timeSinceLastCollectDust: number;
    percentageOfAWeekSinceLastEnergyClaim: number;
    percentageOfAWeekSinceLastShardClaim: number;
    percentageOfAWeekSinceLastDustClaim: number;
    energyCollectable: number;
    shardCollectable: number;
    dustCollectable: number;
  };
}

export interface GetAllGameItemsResponse {
  entities: GameItemEntity[];
}

export interface GetAllEnemiesResponse {
  entities: EnemyEntity[];
}

export interface GetUserMeResponse {
  address: string;
  canEnterGame: boolean;
}

export interface GetNoobsResponse {
  entities: NoobEntity[];
}
export interface NoobEntity {
  docId: string;
  tableName: string;
  LEVEL_CID: number;
  createdAt: string;
  updatedAt: string;
  IS_NOOB_CID: boolean;
  LAST_TRANSFER_TIME_CID?: number;
  INITIALIZED_CID?: boolean;
  OWNER_CID: string;
}

export interface GetUsernamesResponse {
  entities: UsernameEntity[];
}
export interface UsernameEntity {
  docId: string;
  tableName: string;
  LAST_TRANSFER_TIME_CID?: number;
  createdAt: string;
  updatedAt: string;
  NAME_CID: string;
  OWNER_CID: string;
  INITIALIZED_CID?: boolean;
  IS_GIGA_NAME_CID?: boolean;
}

export interface GetFactionResponse {
  entities: FactionEntity[];
}
export interface FactionEntity {
  _id: string;
  docId: string;
  FACTION_CID: number;
  NOOB_TOKEN_CID: number;
  PLAYER_CID: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetBalancesResponse {
  entities: BalanceEntity[];
}
export interface BalanceEntity {
  _id: string;
  docId: string;
  PLAYER_CID: string;
  ID_CID: string;
  BALANCE_CID: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetSkillsProgressResponse {
  entities: SkillsProgressEntity[];
}
export interface SkillsProgressEntity {
  _id: string;
  docId: string;
  LEVEL_CID: number;
  NOOB_TOKEN_CID: number;
  SKILL_CID: number;
  LEVEL_CID_array?: (number | null)[];
  createdAt: string;
  updatedAt: string;
}

export interface GetConsumablesResponse {
  entities: ConsumableEntity[];
}

export interface ConsumableEntity {
  docId: string;
  tableName: string;
  PLAYER_CID: string;
  ID_CID: string;
  BALANCE_CID: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents the skill definitions fetched from /api/offchain/skills
 */
export interface GetAllSkillsResponse {
  entities: SkillDefinition[];
}

export interface SkillDefinition {
  _id: string;
  docId: string; // e.g. "1"
  NAME_CID: string; // e.g. "SKILL#Dungeoneering"
  LEVEL_CID: number; // e.g. 60
  GAME_ITEM_ID_CID: number;
  UINT256_CID: number;
  createdAt: string;
  updatedAt: string;
  stats: SkillStatDefinition[];
}

export interface SkillStatDefinition {
  id: number;
  name: string;
  desc: string;
  levelsPerIncrease: number;
  increaseKey: string; // e.g. "rock", "paper", "scissors", "maxHealth", "maxShield"
  increaseIndex: number; // -1 if not tied to a substat index
  increaseValue: number; // how much each increment adds
}

export interface EnergyEntity {
  _id: string;
  docId: string;
  CONSUMABLES_CID: any[];
  createdAt: string;
  updatedAt: string;
  ENERGY_CID: number;
  TIMESTAMP_CID: number;
  __v: number;
  parsedData: {
    energy: number;
    energyValue: number;
    maxEnergy: number;
    regenPerSecond: number;
    regenPerHour: number;
    secondsSinceLastUpdate: number;
    isPlayerJuiced: boolean;
  };
}

export interface GetEnergyResponse {
  entities: EnergyEntity[];
}

export interface GetGigaJuiceResponse {
  juiceData: JuiceData;
  purchases: any[]; // Assuming purchases is an array of any type based on the empty array
  referrals: any[]; // Assuming referrals is an array of any type based on the empty array
  listings: Listing[];
}

export interface JuiceData {
  isJuiced: boolean;
  juicedSeconds: number;
  _id: string;
  docId: string;
  tableName: string;
  TIMESTAMP_CID: number;
  createdAt: string;
  updatedAt: string;
  lastTx?: string;
}

export interface Listing {
  _id: string;
  docId: string;
  tableName: string;
  ETH_MINT_PRICE_CID: number;
  createdAt: string;
  updatedAt: string;
  TIME_BETWEEN_CID: number;
  NAME_CID: string;
  LOOT_ID_CID_array: number[];
  LOOT_AMOUNT_CID_array: number[];
  START_TIMESTAMP_CID: number;
  END_TIMESTAMP_CID: number;
  OFFERING_NAME: string;
}

export interface GetTodayResponse {
  dayProgressEntities: DayProgressEntity[];
  dungeonDataEntities: DungeonDataEntity[];
}

export interface DayProgressEntity {
  _id: string;
  docId: string;
  UINT256_CID: number;
  ID_CID: string;
  TIMESTAMP_CID: number;
  PLAYER_CID: string;
  DOC_TYPE_CID: string;
  CONSUMABLES_CID: any[]; // Assuming CONSUMABLES_CID is an array of any type based on the empty array
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface DungeonDataEntity {
  ID_CID: number;
  NAME_CID: string;
  ENERGY_CID: number;
  UINT256_CID: number;
  CHECKPOINT_CID: number;
  juicedMaxRunsPerDay: number;
}

// New Fishing State Types
export interface FishingCardEffect {
  type: string;
  amount: number;
}

export interface FishingCard {
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
}

export interface FishingGameData {
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
}

export interface FishingGameState {
  _id: string;
  docId: string;
  docType: string;
  data: FishingGameData;
  COMPLETE_CID: boolean;
  LEVEL_CID: number;
  ID_CID: string;
  PLAYER_CID: string;
  DAY_CID: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface FishingDayDoc {
  _id: string;
  docId: string;
  UINT256_CID: number;
  ID_CID: string;
  TIMESTAMP_CID: number;
  PLAYER_CID: string;
  DOC_TYPE_CID: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  data?: {
    deck: number[];
  };
}

export interface ExchangeRate {
  id: number;
  tier: number;
  baseVal: number;
  value: number;
}

export interface GetFishingStateResponse {
  gameState: FishingGameState;
  dayDoc: FishingDayDoc;
  maxPerDay: number;
  maxPerDayJuiced: number;
  node0Energy: number;
  node1Energy: number;
  node2Energy: number;
  node0Weights: number[];
  node1Weights: number[];
  node2Weights: number[];
  qualityWeights: number[];
  unlockLvlsPerQuality: number[];
  skillLevel: number;
  exchangeRates: ExchangeRate[];
}
