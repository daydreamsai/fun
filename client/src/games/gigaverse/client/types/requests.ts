// path: src/client/types/requests.ts

/**
 * Request payload definitions for core SDK methods.
 */

export interface ClaimEnergyPayload {
  romId: string;
  claimId: string;
}

export interface StartRunPayload {
  actionToken: string | number;
  dungeonId: number;
  data: {
    consumables: any[];
    itemId: number;
    index: number;
  };
}

export interface ActionPayload<T = any> {
  action: string;
  actionToken?: string | number;
  dungeonId: number;
  data: T;
}

export interface EquipPayload {
  tokenId: string;
  itemId: number;
  slotCid: string;
}
