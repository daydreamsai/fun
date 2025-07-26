// path: src/client/GameClient.ts

import { HttpClient } from "./HttpClient";
import {
  MarketplaceFloorResponse,
  MarketplaceItemListingResponse,
} from "./types/game";

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
  GetGigaJuiceResponse,
  GetTodayResponse,
} from "./types/responses";
import { Logger } from "@daydreamsai/core";

export const MAX_ENERGY = 240;
export const MAX_JUICE = 480;

// https://gigaverse.io/api/marketplace/item/floor/all
// https://gigaverse.io/api/marketplace/item/listing/item/413
// https://gigaverse.io/api/fishing/action
// https://gigaverse.io/api/fishing/cards/player/0xcA276DA885Ead124a61846030A3A8424E741Bb82

// {
//   "entities": [
//       {
//           "id": 1,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               1,
//               2,
//               3
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": false
//       },
//       {
//           "id": 2,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               4,
//               5,
//               6
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": false
//       },
//       {
//           "id": 3,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               7,
//               8,
//               9
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": false
//       },
//       {
//           "id": 4,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               1,
//               4,
//               7
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": false
//       },
//       {
//           "id": 5,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               2,
//               5,
//               8
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": false
//       },
//       {
//           "id": 6,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               3,
//               6,
//               9
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": false
//       },
//       {
//           "id": 7,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               1,
//               3,
//               7,
//               9
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 6
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -3
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": true
//       },
//       {
//           "id": 8,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               2,
//               4,
//               6,
//               8
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 5
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -5
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 1,
//           "isDayCard": false,
//           "earnable": true
//       },
//       {
//           "id": 9,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [
//               1,
//               2,
//               3,
//               4,
//               6,
//               7,
//               8,
//               9
//           ],
//           "critZones": [],
//           "hitEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 2
//               }
//           ],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -4
//               }
//           ],
//           "critEffects": [],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": true
//       },
//       {
//           "id": 10,
//           "startingAmount": 1,
//           "manaCost": 1,
//           "hitZones": [],
//           "critZones": [
//               5
//           ],
//           "hitEffects": [],
//           "missEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": -5
//               }
//           ],
//           "critEffects": [
//               {
//                   "type": "FISH_HP",
//                   "amount": 10
//               }
//           ],
//           "unlockLevel": 0,
//           "rarity": 0,
//           "isDayCard": false,
//           "earnable": true
//       }
//   ]
// }

// https://gigaverse.io/api/fishing/action
// {"action":"start_run","actionToken":"","data":{"cards":[],"nodeId":"0"}}
// {
//   "action": "play_cards",
//   "actionToken": "1753497250825",
//   "data": {
//       "cards": [
//           1
//       ],
//       "nodeId": ""
//   }
// }

// {
//   "success": true,
//   "message": "Cards played successfully.",
//   "data": {
//       "doc": {
//           "_id": "68843ff29bcd98de17231a12",
//           "docId": "1826210",
//           "docType": "FISHING_GAME",
//           "data": {
//               "deckCardData": [
//                   {
//                       "id": 1,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           1,
//                           2,
//                           3
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": false
//                   },
//                   {
//                       "id": 2,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           4,
//                           5,
//                           6
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": false
//                   },
//                   {
//                       "id": 3,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           7,
//                           8,
//                           9
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": false
//                   },
//                   {
//                       "id": 4,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           1,
//                           4,
//                           7
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": false
//                   },
//                   {
//                       "id": 5,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           2,
//                           5,
//                           8
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": false
//                   },
//                   {
//                       "id": 6,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           3,
//                           6,
//                           9
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": false
//                   },
//                   {
//                       "id": 7,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           1,
//                           3,
//                           7,
//                           9
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 6
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": true
//                   },
//                   {
//                       "id": 8,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           2,
//                           4,
//                           6,
//                           8
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -5
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 1,
//                       "isDayCard": false,
//                       "earnable": true
//                   },
//                   {
//                       "id": 9,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           1,
//                           2,
//                           3,
//                           4,
//                           6,
//                           7,
//                           8,
//                           9
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 2
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -4
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": true
//                   },
//                   {
//                       "id": 10,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [],
//                       "critZones": [
//                           5
//                       ],
//                       "hitEffects": [],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -5
//                           }
//                       ],
//                       "critEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 10
//                           }
//                       ],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": true
//                   }
//               ],
//               "playerMaxHp": 6,
//               "playerHp": 4,
//               "fishHp": 0,
//               "fishMaxHp": 14,
//               "fishPosition": [
//                   2,
//                   1
//               ],
//               "previousFishPosition": [
//                   2,
//                   1
//               ],
//               "fullDeck": [
//                   1,
//                   2,
//                   3,
//                   4,
//                   5,
//                   6,
//                   7,
//                   8,
//                   9,
//                   10
//               ],
//               "nextCardIndex": 3,
//               "cardInDrawPile": 7,
//               "hand": [
//                   10
//               ],
//               "discard": [
//                   1,
//                   2
//               ],
//               "jebaitorTriggered": false,
//               "day": 20294,
//               "week": 29,
//               "caughtFish": {
//                   "gameItemId": 264,
//                   "name": "Trout",
//                   "rarity": 0,
//                   "size": "MED",
//                   "startDate": null,
//                   "endDate": null,
//                   "moveDistances": [
//                       1
//                   ],
//                   "levelRequired": 0,
//                   "quality": 1,
//                   "sizes": {
//                       "weight": 9.39,
//                       "length": 52.99,
//                       "girth": 11.44
//                   },
//                   "plusOneRarity": false,
//                   "plusOneQuality": false,
//                   "doubled": false,
//                   "findexResult": {
//                       "newFish": true,
//                       "newLength": true,
//                       "newGirth": true,
//                       "newWeight": true,
//                       "newQuality": true,
//                       "totalCaught": 1
//                   },
//                   "seaweedEarned": 0
//               },
//               "cardsToAdd": [
//                   {
//                       "id": 9,
//                       "startingAmount": 1,
//                       "manaCost": 1,
//                       "hitZones": [
//                           1,
//                           2,
//                           3,
//                           4,
//                           6,
//                           7,
//                           8,
//                           9
//                       ],
//                       "critZones": [],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 2
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -4
//                           }
//                       ],
//                       "critEffects": [],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": true
//                   },
//                   {
//                       "id": 36,
//                       "startingAmount": 0,
//                       "manaCost": 1,
//                       "hitZones": [
//                           2,
//                           5,
//                           8
//                       ],
//                       "critZones": [
//                           2,
//                           8
//                       ],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 8
//                           }
//                       ],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": true
//                   },
//                   {
//                       "id": 49,
//                       "startingAmount": 0,
//                       "manaCost": 1,
//                       "hitZones": [
//                           1,
//                           4,
//                           7
//                       ],
//                       "critZones": [
//                           8
//                       ],
//                       "hitEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 5
//                           }
//                       ],
//                       "missEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": -3
//                           }
//                       ],
//                       "critEffects": [
//                           {
//                               "type": "FISH_HP",
//                               "amount": 8
//                           }
//                       ],
//                       "unlockLevel": 0,
//                       "rarity": 0,
//                       "isDayCard": false,
//                       "earnable": true
//                   }
//               ]
//           },
//           "COMPLETE_CID": true,
//           "LEVEL_CID": 0,
//           "ID_CID": "0",
//           "PLAYER_CID": "0xca276da885ead124a61846030a3a8424e741bb82",
//           "DAY_CID": 20294,
//           "createdAt": "2025-07-26T02:39:46.499Z",
//           "updatedAt": "2025-07-26T02:40:33.311Z",
//           "__v": 0,
//           "SUCCESS_CID": true
//       },
//       "events": [
//           {
//               "type": "FISH_MOVED",
//               "value": 4,
//               "playerId": -1,
//               "batch": 0,
//               "data": {}
//           },
//           {
//               "type": "CARD_PLAYED",
//               "value": 1,
//               "playerId": 0,
//               "batch": 1,
//               "data": {
//                   "result": 1
//               }
//           },
//           {
//               "type": "HIT",
//               "value": 5,
//               "playerId": 0,
//               "batch": 1,
//               "data": {
//                   "result": 4
//               }
//           },
//           {
//               "type": "FISH_HP_DIFF",
//               "value": 5,
//               "playerId": 0,
//               "batch": 1,
//               "data": {
//                   "result": 0
//               }
//           },
//           {
//               "type": "FISH_DIED",
//               "value": 264,
//               "playerId": 0,
//               "batch": 2,
//               "data": {
//                   "fish": {
//                       "gameItemId": 264,
//                       "name": "Trout",
//                       "rarity": 0,
//                       "size": "MED",
//                       "startDate": null,
//                       "endDate": null,
//                       "moveDistances": [
//                           1
//                       ],
//                       "levelRequired": 0,
//                       "quality": 1,
//                       "sizes": {
//                           "weight": 9.39,
//                           "length": 52.99,
//                           "girth": 11.44
//                       },
//                       "plusOneRarity": false,
//                       "plusOneQuality": false,
//                       "doubled": false,
//                       "findexResult": {
//                           "newFish": true,
//                           "newLength": true,
//                           "newGirth": true,
//                           "newWeight": true,
//                           "newQuality": true,
//                           "totalCaught": 1
//                       },
//                       "seaweedEarned": 0
//                   }
//               }
//           }
//       ]
//   },
//   "gameItemBalanceChanges": [
//       {
//           "id": 264,
//           "amount": 1,
//           "gearInstanceId": "",
//           "rarity": -1
//       }
//   ],
//   "actionToken": 1753497634175
// }

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

  public async getMarketplaceItemFloor() {
    return this.httpClient.get<MarketplaceFloorResponse[]>(
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
  recipies: any[];
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
