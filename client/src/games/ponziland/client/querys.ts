import { http } from "@daydreamsai/core";
import { CairoCustomEnum, Contract } from "starknet";
import { auction_query, land_query } from "./gql_querys";
import { getAllTokensFromAPI, type TokenPrice } from "./ponziland_api";
import { getTokenData } from "../utils/utils";
import { ponziland_address, TORII_URL } from "../constants";
import { ClientsContext } from ".";

const client = <T>(query: string, variables?: any) =>
  http
    .graphql<{ data: T }>(TORII_URL + "/graphql", query, variables)
    .then((res) => res.data);

export const get_balances = async (
  address: string,
  tokens: TokenPrice[],
  { provider }: ClientsContext
) => {
  const balancesData = await Promise.all(
    tokens.map(async (token) => {
      const abi = await provider.getClassAt(token.address);
      const contract = new Contract(abi.abi, token.address, provider);
      const balance = await contract.call("balanceOf", [address]);
      const approved = await contract.call("allowance", [
        address,
        ponziland_address,
      ]);
      return {
        name: token.symbol,
        balance: BigInt(balance.toString()) / BigInt(10 ** 18),
        approved: BigInt(approved.toString()) / BigInt(10 ** 18),
        address: token.address,
      };
    })
  );

  return balancesData;
};

type Land = {
  location: number;
  sell_price: bigint;
  token_used: string;
  owner: string;
};

type LandModel = {
  location: number;
  sell_price: string;
  token_used: string;
  owner: string;
};

export const get_lands = async (
  owner: string,
  tokens: TokenPrice[],
  ctx: ClientsContext
) => {
  const { ponziLandContract } = ctx;

  owner = owner.toUpperCase();

  const lands: Land[] = await client<{
    ponziLandLandModels: { edges: { node: LandModel }[] };
  }>(land_query, { where: { owner } }).then((res) =>
    res?.ponziLandLandModels?.edges?.map((edge) => ({
      ...edge?.node,
      sell_price: BigInt(edge.node.sell_price),
    }))
  );

  const nuke_time = await Promise.all(
    lands.map((land) => {
      const info = ponziLandContract.call("get_time_to_nuke", [land.location]);
      return info;
    })
  );

  const yields = await Promise.all(
    lands.map(async (land) => {
      return await calculateLandYield(
        land.location,
        land.token_used,
        tokens,
        ctx
      );
    })
  );

  return {
    lands,
    nuke_time,
    yields,
  };
};

export const get_claims = async (
  owner: string,
  { ponziLandContract }: ClientsContext
) => {
  const lands = await client<{
    ponziLandLandModels: { edges: { node: LandModel }[] };
  }>(land_query, { where: { owner } }).then((res) =>
    res?.ponziLandLandModels?.edges?.map((edge) => edge?.node)
  );

  const land_claims = await Promise.all(
    lands.map(async (land) => {
      const res = (await ponziLandContract.call("get_next_claim_info", [
        land.location,
      ])) as {
        amount: bigint;
        can_be_nuked: boolean;
        land_location: bigint;
        token_address: bigint;
      }[];

      return res.map((r) => ({
        ...r,
        token_address: "0x" + BigInt(r.token_address).toString(16),
      }));
    })
  );
  return land_claims.flat();
};

export type Auction = {
  start_price: bigint;
  start_time: number;
  is_finished: boolean;
  land_location: number;
  floor_price: bigint;
  current_price: bigint;
  decay_rate: number;
};

export type AuctionModel = {
  start_price: string;
  start_time: string;
  is_finished: boolean;
  land_location: number;
  floor_price: string;
  current_price: string;
  decay_rate: number;
};

export const get_auctions = async ({ provider }: ClientsContext) => {
  const auctions: Auction[] = await client<{
    ponziLandAuctionModels: { edges: { node: AuctionModel }[] };
  }>(auction_query, {}).then((res) => {
    return res.ponziLandAuctionModels?.edges?.map((edge) => ({
      ...edge.node,
      start_price: BigInt(edge.node.start_price),
      start_time: Number(BigInt(edge.node.start_time)),
      floor_price: BigInt(edge.node.floor_price),
      current_price: BigInt(0),
    }));
  });

  const initial_prices = await Promise.all(
    auctions.map(async (auction) => {
      const current_price = await provider.callContract({
        contractAddress: ponziland_address,
        entrypoint: "get_current_auction_price",
        calldata: [auction.land_location],
      });

      return BigInt(current_price[0]) / BigInt(10 ** 18);
    })
  );

  auctions.forEach((auction, index: number) => {
    auction.current_price = initial_prices[index];
  });

  return auctions;
};

export const get_neighbors = async (
  location: number,
  { viewContract }: ClientsContext
) => {
  const neighbors = await viewContract.get_neighbors(location);
  return neighbors;
};

export const get_all_lands = async (address: string) => {
  const lands = await client<{
    ponziLandLandModels: { edges: { node: LandModel }[] };
  }>(
    /* GraphQL */ `
      query {
        ponziLandLandModels(first: 50) {
          edges {
            node {
              location
              token_used
              sell_price
              owner
            }
          }
        }
      }
    `,
    {}
  ).then((res) => res?.ponziLandLandModels?.edges?.map((edge) => edge?.node));

  const filteredLands = lands.filter(
    (land) => land.owner != address && BigInt(land.owner) != BigInt(0)
  );
  return filteredLands;
};

export const get_auction_yield = async (
  location: number,
  tokens: TokenPrice[],
  ctx: ClientsContext
) => {
  const neighbors = await ctx.viewContract.get_neighbors(location);
  const income = await calculateIncome(neighbors, tokens, ctx);
  return income;
};

export const get_unowned_land_yield = async (
  location: number,
  tokens: TokenPrice[],
  ctx: ClientsContext
) => {
  const neighbors = await ctx.viewContract.get_neighbors(location);
  const income = await calculateIncome(neighbors, tokens, ctx);
  return income;
};

export const get_player_lands = async (owner: string) => {
  const lands = await client(land_query, { where: { owner } }).then(
    (res: any) =>
      res?.ponziLandLandModels?.edges?.map((edge: any) => edge?.node)
  );

  return lands;
};

export const calculateLandYield = async (
  location: number,
  token_used: string,
  tokens: TokenPrice[],
  ctx: ClientsContext
) => {
  const token = getTokenData(token_used, tokens);

  if (!token) {
    throw new Error("Token data not found");
  }

  let tax_rate = Number(
    await ctx.viewContract.get_tax_rate_per_neighbor(location)
  );

  if (token.ratio) {
    tax_rate = tax_rate * token.ratio;
  }

  if (tax_rate === 0) {
    return 0n;
  }

  const neighbors = await ctx.viewContract.get_neighbors(location);
  return calculateIncome(neighbors, tokens, ctx);
};

async function calculateIncome(
  neighbors: CairoCustomEnum[],
  tokens: TokenPrice[],
  { viewContract }: ClientsContext
) {
  let income = BigInt(0);

  const neighbor_tax_rates = await Promise.all(
    neighbors.map(async (neighbor) => {
      if (neighbor.activeVariant() == "Land") {
        const value = neighbor.unwrap();
        return (await viewContract.get_tax_rate_per_neighbor(
          value.location
        )) as bigint;
      }
      return 0n;
    })
  );

  for (const [index, neighbor] of neighbors.entries()) {
    if (neighbor.activeVariant() !== "Land") continue;
    const value = neighbor.unwrap();
    const neighbor_yield = neighbor_tax_rates[index];
    const neighbor_token = getTokenData(value.token_used, tokens);
    if (!neighbor_token) continue;
    if (!neighbor_token.ratio) {
      income += neighbor_yield;
    } else {
      const adjusted_yield = Math.floor(
        Number(neighbor_yield) / neighbor_token.ratio
      );
      income += BigInt(adjusted_yield);
    }
  }

  return income;
}

export const get_prices = async () => {
  const tokens = await getAllTokensFromAPI();
  return tokens;
};
