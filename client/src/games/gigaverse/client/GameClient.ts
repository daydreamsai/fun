// path: src/client/GameClient.ts

import { HttpClient } from "./HttpClient";
import {
  FishingActionPlayCardsResponse,
  FishingActionStartRun,
  MarketplaceFloorResponse,
  MarketplaceItemListingResponse,
} from "./types/game";

import {
  ActionPayload,
  ClaimEnergyPayload,
  StartRunPayload,
  EquipPayload,
} from "./types/requests";

import {
  ClaimEnergyResponse,
  GetAllEnemiesResponse,
  GetAllGameItemsResponse,
  GetUserRomsResponse,
  GetUserMeResponse,
  GetNoobsResponse,
  GetUsernamesResponse,
  GetFactionResponse,
  GetBalancesResponse,
  GetSkillsProgressResponse,
  GetConsumablesResponse,
  GetAllSkillsResponse,
  BaseResponse,
  GetEnergyResponse,
  GetGigaJuiceResponse,
  GetTodayResponse,
  GetFishingStateResponse,
  EquipResponse,
} from "./types/responses";
import { Logger } from "@daydreamsai/core";

export const MAX_ENERGY = 240;
export const MAX_JUICE = 480;

export const HEAD_CID =
  "88599653422272993884141208563120605573864330818693086527897261466689762533731";

export const BODY_CID =
  "115305014569596518278023142279117918212535487760226513356624296206403416463707";

/**
 * Main SDK class exposing methods for dungeon runs, user data, items, etc.
 */
export class GameClient {
  private logger: Logger;
  private httpClient: HttpClient;
  private currentActionToken: string | number | null = null;

  constructor(baseUrl: string, authToken: string, logger: Logger) {
    this.httpClient = new HttpClient(baseUrl, authToken, logger);
    this.logger = logger;
  }

  public setAuthToken(newToken: string) {
    this.httpClient.setAuthToken(newToken);
  }

  public getActionToken(): string | number | null {
    return this.currentActionToken;
  }

  public setActionToken(token: string | number) {
    this.currentActionToken = token;
  }

  /**
   * Claims a resource like "energy", "shard", or "dust".
   */
  public async claimEnergy(
    payload: ClaimEnergyPayload
  ): Promise<ClaimEnergyResponse> {
    this.logger.info("gigaverse-http-client", "Claiming resource...");
    const endpoint = "/roms/factory/claim";
    const response = await this.httpClient.post<ClaimEnergyResponse>(
      endpoint,
      payload
    );

    this.logger.info(
      "gigaverse-http-client",
      `Claim result => success: ${response.success}`
    );
    return response;
  }

  public async getEnergy(address: string): Promise<GetEnergyResponse> {
    this.logger.info("gigaverse-http-client", "Getting energy...");

    const energy = await this.httpClient.get<GetEnergyResponse>(
      `/offchain/player/energy/${address}`
    );

    return energy;
  }

  /**
   * Starts a dungeon run, storing the returned actionToken automatically.
   */
  public async startRun(payload: StartRunPayload): Promise<BaseResponse> {
    this.logger.info("gigaverse-http-client", "Starting dungeon run...");
    const endpoint = "/game/dungeon/action";
    const body = {
      action: "start_run",
      actionToken: payload.actionToken,
      dungeonId: payload.dungeonId,
      data: payload.data,
    };

    const response = await this.httpClient.post<BaseResponse>(endpoint, body);
    if (response.actionToken) {
      this.setActionToken(response.actionToken);
      this.logger.info(
        "gigaverse-http-client",
        `New action token: ${response.actionToken}`
      );
    }
    return response;
  }

  /**
   * Performs a move or loot action.
   * Action can be "rock", "paper", "scissor", "loot_one", etc.
   */
  public async playMove(payload: ActionPayload): Promise<BaseResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Performing action: ${payload.action}`
    );
    const endpoint = "/game/dungeon/action";

    const finalToken = payload.actionToken ?? this.currentActionToken ?? "";
    const body = {
      action: payload.action,
      actionToken: finalToken,
      dungeonId: payload.dungeonId,
      data: payload.data,
    };

    const response = await this.httpClient.post<BaseResponse>(endpoint, body);
    return response;
  }

  /**
   * Uses an item (e.g. "use_item" action with itemId, index).
   */
  public async useItem(
    payload: Omit<ActionPayload<{ index: number; itemId: number }>, "action">
  ): Promise<BaseResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Using item. ID: ${payload.data?.itemId}`
    );
    const endpoint = "/game/dungeon/action";

    const body = {
      action: "use_item",
      actionToken: payload.actionToken,
      dungeonId: payload.dungeonId,
      data: payload.data,
    };

    const response = await this.httpClient.post<BaseResponse>(endpoint, body);

    return response;
  }

  /**
   * Retrieves all ROMs associated with the given address.
   */
  public async getUserRoms(address: string): Promise<GetUserRomsResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Fetching user ROMs for address: ${address}`
    );
    const endpoint = `/roms/player/${address}`;
    return this.httpClient.get<GetUserRomsResponse>(endpoint);
  }

  /**
   * Fetches the current dungeon state. If run=null, not in a run.
   */
  public async fetchDungeonState(): Promise<BaseResponse> {
    this.logger.info("gigaverse-http-client", "Fetching dungeon state...");
    const endpoint = "/game/dungeon/state";
    return this.httpClient.get<BaseResponse>(endpoint);
  }

  /**
   * Retrieves all available game items from the indexer.
   */
  public async getAllGameItems(): Promise<GetAllGameItemsResponse> {
    this.logger.info("gigaverse-http-client", "Fetching all game items...");
    const endpoint = "/indexer/gameitems";
    return this.httpClient.get<GetAllGameItemsResponse>(endpoint);
  }

  /**
   * Retrieves all enemies from the indexer.
   */
  public async getAllEnemies(): Promise<GetAllEnemiesResponse> {
    this.logger.info("gigaverse-http-client", "Fetching enemies...");
    const endpoint = "/indexer/enemies";
    return this.httpClient.get<GetAllEnemiesResponse>(endpoint);
  }

  /**
   * Retrieves the wallet address and a flag indicating if the user can enter the game.
   */
  public async getUserMe(): Promise<GetUserMeResponse> {
    this.logger.info("gigaverse-http-client", "Fetching /user/me");
    const endpoint = "/user/me";
    return this.httpClient.get<GetUserMeResponse>(endpoint);
  }

  /**
   * Retrieves all 'noob' heroes for the given address.
   */
  public async getNoobs(address: string): Promise<GetNoobsResponse> {
    this.logger.info("gigaverse-http-client", `Fetching noobs for: ${address}`);
    const endpoint = `/indexer/player/noobs/${address}`;
    return this.httpClient.get<GetNoobsResponse>(endpoint);
  }

  /**
   * Retrieves all usernames (GigaName NFTs) for the given address.
   */
  public async getUsernames(address: string): Promise<GetUsernamesResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Fetching usernames for: ${address}`
    );
    const endpoint = `/indexer/player/usernames/${address}`;
    return this.httpClient.get<GetUsernamesResponse>(endpoint);
  }

  /**
   * Retrieves faction info (e.g. faction ID) for the given address.
   */
  public async getFaction(address: string): Promise<GetFactionResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Fetching faction for: ${address}`
    );
    const endpoint = `/factions/player/${address}`;
    return this.httpClient.get<GetFactionResponse>(endpoint);
  }

  /**
   * Retrieves balances of various items for the given address.
   */
  public async getUserBalances(): Promise<GetBalancesResponse> {
    this.logger.info("gigaverse-http-client", `Fetching user balances`);
    const endpoint = `/items/balances`;
    return this.httpClient.get<GetBalancesResponse>(endpoint);
  }

  /**
   * Retrieves hero's skill progress and level, given a noobId.
   */
  public async getHeroSkillsProgress(
    noobId: string | number
  ): Promise<GetSkillsProgressResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Fetching skill progress for noobId: ${noobId}`
    );
    const endpoint = `/offchain/skills/progress/${noobId}`;
    return this.httpClient.get<GetSkillsProgressResponse>(endpoint);
  }

  /**
   * Retrieves consumable items the user holds, from the indexer.
   */
  public async getConsumables(
    address: string
  ): Promise<GetConsumablesResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Fetching consumables for: ${address}`
    );
    const endpoint = `/indexer/player/gameitems/${address}`;
    return this.httpClient.get<GetConsumablesResponse>(endpoint);
  }

  /**
   * Retrieves global skill definitions from /offchain/skills.
   */
  public async getAllSkills(): Promise<GetAllSkillsResponse> {
    this.logger.info("gigaverse-http-client", "Fetching skill definitions...");
    const endpoint = "/offchain/skills";
    return this.httpClient.get<GetAllSkillsResponse>(endpoint);
  }

  /**
   * Retrieves global skill definitions from /offchain/skills.
   */
  public async getAllItemsOffchain() {
    this.logger.info(
      "gigaverse-http-client",
      "Fetching offchain game items definitions..."
    );
    return this.httpClient.get<{ entities: OffchainItems[] }>(
      "/offchain/gameitems"
    );
  }

  public async levelUp(params: {
    noobId: number;
    skillId: number;
    statId: number;
  }) {
    this.logger.info("gigaverse-http-client", "Level up");
    return this.httpClient.post<BaseResponse<{}>>(
      "/game/skill/levelup",
      params
    );
  }

  public async getJuice(address: string) {
    return this.httpClient.get<GetGigaJuiceResponse>(
      "/gigajuice/player/" + address
    );
  }

  // fishing
  public async getFishingCards(address: string) {
    return this.httpClient.get<GetFishingCardsResponse>(
      "/fishing/cards/player/" + address
    );
  }

  public async startFishingRun(payload: FishingActionStartRun) {
    return this.httpClient.post<FishingActionPlayCardsResponse>(
      "/fishing/action",
      payload
    );
  }

  public async getFishingState(address: string) {
    return this.httpClient.get<GetFishingStateResponse>(
      "/fishing/state/" + address
    );
  }

  public async getMarketplaceItemFloor() {
    return this.httpClient.get<MarketplaceFloorResponse>(
      "/marketplace/item/floor/all"
    );
  }

  public async getMarketplaceItemListing(itemId: number) {
    return this.httpClient.get<MarketplaceItemListingResponse>(
      "/marketplace/item/listing/item/" + itemId
    );
  }

  public async getToday() {
    return this.httpClient.get<GetTodayResponse>("/game/dungeon/today");
  }

  public async getAccount(address: string) {
    return this.httpClient.get<GetAccountResponse>("/account/" + address);
  }

  public async getStatic() {
    return this.httpClient.get<GetStaticResponse>("/offchain/static");
  }

  public async getEquipedGear(noodId: string) {
    return this.httpClient.get<EquipedGearResponse>(
      "/offchain/equipment/79966817350501100526447415351088260038671993089879876864314793285447998749147/" +
        noodId
    );
  }

  /**
   * Equips an item to a specific slot
   */
  public async equip(payload: EquipPayload): Promise<EquipResponse> {
    this.logger.info("gigaverse-http-client", "Equipping item...");
    const endpoint = "/game/equip";
    return this.httpClient.post<EquipResponse>(endpoint, payload);
  }
}

export interface GetFishingCardsResponse {
  entities: {
    ID_CID: number;
    docId: string;
    TYPE_CID: string;
  }[];
}

export interface GetStaticResponse {
  checkpoints: {
    DESCRIPTION_CID: string;
    ID_CID: string;
    INPUT_AMOUNT_CID_array: number[];
    INPUT_ID_CID_array: number[];
    MAX_COMPLETIONS_CID: number;
    NAME_CID: string;
    UINT256_CID_array: number[];
    docId: string;
  }[];
  constants: {
    dungeonEnergyCost: number;
    energyRegenRate: number;
    maxEnergy: number;
    maxEnergyJuiced: number;
    minTimeBetweenExports: number;
    minTimeBetweenImports: number;
    regenRateJuiced: number;
  };
  enemies: GetAllEnemiesResponse["entities"];
  gameItems: OffchainItems[];
  recipies: {
    docId: string;
    ID_CID: string;
    NAME_CID: string;
    FACTION_CID_array: number[];
    GEAR_TYPE_CID: number;
    DURABILITY_CID: number;
    TIER_CID: number;
    UINT256_CID: number;
    INPUT_NAMES_CID_array: string[];
    INPUT_ID_CID_array: number[];
    INPUT_AMOUNT_CID_array: number[];
    LOOT_ID_CID_array: number[];
    LOOT_AMOUNT_CID_array: number[];
    LOOT_FULFILLER_ID_CID_array: string[];
    TIME_BETWEEN_CID: number;
    TAG_CID_array: string[];
    SUCCESS_RATE_CID: number;
    COOLDOWN_CID: number;
    MAX_COMPLETIONS_CID: number;
    ENERGY_CID: number;
    IS_JUICED_CID: boolean;
    IS_WEEKLY_CID: boolean;
    IS_DAILY_CID: boolean;
    JUICED_MULTIPLIER_CID: number;
  }[];
}

export interface GetAccountResponse {
  accountEntity: AccountEntity;
  usernames: GigaNameNFT[];
  noob: GigaNoobNFT;
  checkpointProgress: {
    COMPLETE_CID: boolean;
    COMPLETIONS_CID: number;
    ID_CID: string;
    PLAYER_CID: string;
    createdAt: string;
    docId: string;
    updatedAt: string;
    __v: number;
    _id: string;
  }[];
}

interface AccountEntity {
  _id: string;
  docId: string;
  tableName: string;
  GIGA_NAME_TOKENDID_CID: string;
  createdAt: string;
  updatedAt: string;
  NOOB_TOKEN_CID: number;
}

interface GigaNameNFT {
  _id: string;
  docId: string;
  tableName: string;
  IS_GIGA_NAME_CID: boolean;
  createdAt: string;
  updatedAt: string;
  NAME_CID: string;
  OWNER_CID: string;
  LAST_TRANSFER_TIME_CID: number;
  INITIALIZED_CID: boolean;
}

interface GigaNoobNFT {
  _id: string;
  docId: string;
  tableName: string;
  LAST_TRANSFER_TIME_CID: number;
  createdAt: string;
  updatedAt: string;
  OWNER_CID: string;
  IS_NOOB_CID: boolean;
  INITIALIZED_CID: boolean;
  LEVEL_CID: number;
}

export type OffchainItems = {
  ID_CID: number;
  docId: string;
  TYPE_CID: string;
  NAME_CID: string;
  DESCRIPTION_CID: string;
  RARITY_CID: number;
  RARITY_NAME: string;
  IMG_URL_CID: string;
  ICON_URL_CID: string;
};

export type EquipedGear = {
  _id: string;
  docId: string;
  CONSUMABLES_CID: any[];
  createdAt: string;
  updatedAt: string;
  EQUIPMENT_BODY_CID: number;
  EQUIPMENT_HEAD_CID: number;
};

export type EquipedGearResponse = {
  entities: EquipedGear[];
};
