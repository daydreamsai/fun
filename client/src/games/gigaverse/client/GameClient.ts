// path: src/client/GameClient.ts

import { HttpClient } from "./HttpClient";

import {
  ActionPayload,
  ClaimEnergyPayload,
  StartRunPayload,
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
} from "./types/responses";
import { Logger } from "@daydreamsai/core";

export const MAX_ENERGY = 240;

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

  public async getEnergy(address: string): Promise<number> {
    this.logger.info("gigaverse-http-client", "Getting energy...");
    const regenRate = 2777777;

    const now = Date.now() / 1000;

    const energy = await this.httpClient.get<GetEnergyResponse>(
      `/offchain/player/energy/${address}`
    );

    const lastClaim = energy.entities[0].TIMESTAMP_CID;

    const timeSinceLastClaim = now - lastClaim;

    const energyToAdd = regenRate * timeSinceLastClaim;

    const newEnergy =
      (energyToAdd + energy.entities[0].ENERGY_CID) / 1000000000;

    if (newEnergy > MAX_ENERGY) {
      return MAX_ENERGY;
    }

    return newEnergy;
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
    if (response.actionToken) {
      this.setActionToken(response.actionToken);
      this.logger.info(
        "gigaverse-http-client",
        `Updated action token: ${response.actionToken}`
      );
    }
    if (response.gameItemBalanceChanges?.length) {
      this.logger.info(
        "gigaverse-http-client",
        `gameItemBalanceChanges: ${JSON.stringify(response.gameItemBalanceChanges)}`
      );
    }
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

    const finalToken = payload.actionToken ?? this.currentActionToken ?? "";

    const body = {
      action: "use_item",
      actionToken: finalToken,
      dungeonId: payload.dungeonId,
      data: payload.data,
    };

    const response = await this.httpClient.post<BaseResponse>(endpoint, body);
    if (response.actionToken) {
      this.setActionToken(response.actionToken);
      this.logger.info(
        "gigaverse-http-client",
        `Updated action token: ${response.actionToken}`
      );
    }
    if (response.gameItemBalanceChanges?.length) {
      this.logger.info(
        "gigaverse-http-client",
        `gameItemBalanceChanges: ${JSON.stringify(response.gameItemBalanceChanges)}`
      );
    }
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
  public async getUserBalances(address: string): Promise<GetBalancesResponse> {
    this.logger.info(
      "gigaverse-http-client",
      `Fetching user balances for: ${address}`
    );
    const endpoint = `/importexport/balances/${address}`;
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
    return this.httpClient.post<any>("game/skill/levelup", params);
  }
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
