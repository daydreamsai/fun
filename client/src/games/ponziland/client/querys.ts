import { http } from "@daydreamsai/core";
import { CairoCustomEnum, Contract } from "starknet";
import { auction_query, land_query } from "./gql_querys";
import { getAllTokensFromAPI, type TokenPrice } from "./ponziland_api";
import { getTokenData, formatTokenAmount } from "../utils/utils";
import { ponziland_address, TORII_URL } from "../constants";
import { ClientsContext } from ".";

const client = <T>(query: string, variables?: any) =>
  http
    .graphql<{ data: T }>(TORII_URL + "/graphql", query, variables)
    .then((res) => res.data);

export const get_balances = async (
  address: string,
  { provider }: ClientsContext
) => {
  // Retrieve balance and allowance info for each token via the contracts array.
  const tokens = await getAllTokensFromAPI();
  console.log("tokens", tokens);

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

  // // Build the display parts using token names.
  // const tokenBalances = balancesData
  //   .map(
  //     (t) =>
  //       `<${t.name}> \n Balance: ${t.balance} \n Address: ${t.address} </${t.name}>`
  //   )
  //   .join("\n\n\n");

  // const res = `
  // Token Balances:
  // ${tokenBalances}
  // `;
  // console.log("res", res);
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

export const get_lands = async (owner: string, ctx: ClientsContext) => {
  const { ponziLandContract } = ctx;

  const lands: Land[] = await client<{
    ponziLandLandModels: { edges: { node: LandModel }[] };
  }>(land_query, { where: { owner } }).then((res) =>
    res?.ponziLandLandModels?.edges?.map((edge) => ({
      ...edge?.node,
      sell_price: BigInt(edge.node.sell_price),
    }))
  );

  console.log(land_query);
  console.log("lands", lands);

  const tokens = await getAllTokensFromAPI();

  const nuke_time = await Promise.all(
    lands.map((land) => {
      const info = ponziLandContract.call("get_time_to_nuke", [land.location]);
      return info;
    })
  );

  const yields = await Promise.all(
    lands.map(async (land) => {
      return await calculateLandYield(land, tokens, ctx);
    })
  );

  console.log("yields", yields);

  // const land = lands
  //   .map(
  //     (land: any, index: number) =>
  //       `location: ${BigInt(land.location).toString()} -
  //   Token: ${getTokenData(land.token_used, tokens)?.symbol}
  //   Remaining Stake Time: ${nuke_time[index] / BigInt(60)} minutes

  //   Yield: ${yields[index]}

  //   Listed Price: ${BigInt(land.sell_price).toString()}
  // `
  //   )
  //   .join("\n");

  // console.log("land", land);
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

  // const tokens = await getAllTokensFromAPI();

  // // Flatten the claims data and format it
  // const claims = lands
  //   .map((land: any, index: number) => {
  //     const landClaims = land_claims[index]
  //       .map((claim: any) => {
  //         // Find matching contract for the token
  //         for (const contract of tokens) {
  //           if (BigInt(claim.token_address) === BigInt(contract.address)) {
  //             return `    ${contract.symbol}: ${BigInt(claim.amount)}`;
  //           }
  //         }
  //         return "";
  //       })
  //       .filter((claim: any) => claim !== "")
  //       .join("\n");

  //     return `Land ${BigInt(land.location).toString()}:\n${landClaims}`;
  //   })
  //   .join("\n\n");

  // console.log("claims", claims);
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
    console.log({ res });
    return res.ponziLandAuctionModels?.edges?.map((edge) => ({
      ...edge.node,
      start_price: BigInt(edge.node.start_price),
      start_time: Number(BigInt(edge.node.start_time)),
      floor_price: BigInt(edge.node.floor_price),
      current_price: BigInt(0),
    }));
  });

  const initial_prices = await Promise.all(
    auctions.map((auction) => {
      const current_price = provider
        .callContract({
          contractAddress: ponziland_address,
          entrypoint: "get_current_auction_price",
          calldata: [auction.land_location],
        })
        .then((res) => BigInt(res[0]) / BigInt(10 ** 18));
      return current_price;
    })
  );

  auctions.forEach((auction, index: number) => {
    auction.current_price = initial_prices[index];
  });

  return auctions;
};

export const get_neighbors = async (
  location: number,
  address: string,
  { viewContract }: ClientsContext
) => {
  const neighbors: Array<CairoCustomEnum> =
    await viewContract.get_neighbors(location);

  // const tokens = await getAllTokensFromAPI();

  // const res = neighbors
  //   .map((temp: CairoCustomEnum) => {
  //     if (temp.activeVariant() == "Land") {
  //       const neighbor = temp.unwrap();
  //       const tokenData = getTokenData(neighbor.token_used, tokens);
  //       const tokenSymbol = tokenData?.symbol || "Unknown";

  //       if (BigInt(neighbor.owner) != BigInt(address)) {
  //         return `Location: ${BigInt(neighbor.location).toString()} - Sell Price: ${BigInt(neighbor.sell_price).toString()} - Token: ${tokenSymbol}`;
  //       } else {
  //         return `Location: ${BigInt(neighbor.location).toString()} - Sell Price: ${BigInt(neighbor.sell_price).toString()} - Token: ${tokenSymbol} - Owner: ${neighbor.owner} (You)`;
  //       }
  //     } else if (temp.activeVariant() == "Auction") {
  //       const neighbor = temp.unwrap();
  //       return `Location: ${BigInt(neighbor.land_location).toString()} - Auction`;
  //     } else {
  //       return ``;
  //     }
  //   })
  //   .join("\n");

  return neighbors;
};

export const get_all_lands = async (address: string) => {
  const lands = await client(
    "query { ponziLandLandModels(first: 50) { edges { node { location token_used sell_price owner } } } }",
    {}
  ).then((res: any) =>
    res?.ponziLandLandModels?.edges?.map((edge: any) => edge?.node)
  );

  const tokens = await getAllTokensFromAPI();

  const filteredLands = lands.filter(
    (land: any) => land.owner != address && BigInt(land.owner) != BigInt(0)
  );
  console.log("lands", filteredLands);

  const land = filteredLands
    .map((land: any) => {
      const tokenData = getTokenData(land.token_used, tokens);
      const tokenSymbol = tokenData?.symbol || "Unknown";
      return ` Owner: ${land.owner} Location: ${BigInt(land.location).toString()} Token: ${tokenSymbol} sell price: ${formatTokenAmount(BigInt(land.sell_price))}`;
    })
    .join("\n");

  return land;
};

export const get_auction_yield = async (
  location: number,
  tokens: TokenPrice[],
  { viewContract }: ClientsContext
) => {
  const neighbors = await viewContract.get_neighbors(location);
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

  let detailed_income = "";

  neighbors.forEach((neighbor, index) => {
    if (neighbor.activeVariant() == "Land") {
      const value = neighbor.unwrap();
      console.log("value", value);
      const neighbor_yield = neighbor_tax_rates[index];
      const neighbor_token = getTokenData(value.token_used, tokens);

      if (!neighbor_token) {
        console.log("No token?");
      } else {
        // Yield is in estark
        if (!neighbor_token.ratio) {
          income += BigInt(neighbor_yield);
          detailed_income += `
          Location: ${value.location} - Yield: ${formatTokenAmount(BigInt(neighbor_yield))} estark
          `;
        } else {
          const adjusted_yield = Math.floor(
            Number(neighbor_yield) / neighbor_token.ratio
          );
          income += BigInt(adjusted_yield);
          detailed_income += `
          Location: ${value.location} - Yield: ${formatTokenAmount(BigInt(neighbor_yield))} ${neighbor_token.symbol} (${formatTokenAmount(BigInt(adjusted_yield))} estark)
          `;
        }
      }
    }
  });

  const max_price = (Number(income) * 8) / 0.02;
  return `
  PotentialIncome: ${formatTokenAmount(income)} estark
  <detailed_income>
  ${detailed_income}
  </detailed_income>

  Maximum Listing Price For Profit: ${formatTokenAmount(BigInt(Math.floor(max_price)))} estark. (If you list for more than this you will lose money)
  Only bid on auctions if you can list it for less than this, but more than the auction price. 
  `;
};

export const get_unowned_land_yield = async (
  location: number,
  tokens: TokenPrice[],
  { viewContract }: ClientsContext
) => {
  let income = BigInt(0);

  const neighbors = await viewContract.get_neighbors(location);
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

  let detailed_income = "";

  neighbors.forEach((neighbor: any, index: number) => {
    if (neighbor.activeVariant() == "Land") {
      const value = neighbor.unwrap();
      console.log("value", value);
      const neighbor_yield = neighbor_tax_rates[index];
      const neighbor_token = getTokenData(value.token_used, tokens);

      if (!neighbor_token) {
        console.log("No token?");
      } else {
        // Yield is in estark
        if (!neighbor_token.ratio) {
          income += BigInt(neighbor_yield);
          detailed_income += `
          Location: ${value.location} - Yield: ${formatTokenAmount(BigInt(neighbor_yield))} estark
          `;
        } else {
          const adjusted_yield = Math.floor(
            Number(neighbor_yield) / neighbor_token.ratio
          );
          income += BigInt(adjusted_yield);
          detailed_income += `
          Location: ${value.location} - Yield: ${formatTokenAmount(BigInt(neighbor_yield))} ${neighbor_token.symbol} (${formatTokenAmount(BigInt(adjusted_yield))} estark)
          `;
        }
      }
    }
  });

  const max_price = (Number(income) * 8) / 0.02;
  return `
  PotentialIncome: ${formatTokenAmount(income)} estark
  <detailed_income>
  ${detailed_income}
  </detailed_income>

  Maximum Listing Price For Profit: ${formatTokenAmount(BigInt(Math.floor(max_price)))} estark. (If you list for more than this you will lose money)
  Only bid on auctions if you can list it for less than this, but more than the auction price. 
  `;
};

export const get_player_lands = async (owner: string) => {
  const lands = await client(land_query, { where: { owner } }).then(
    (res: any) =>
      res?.ponziLandLandModels?.edges?.map((edge: any) => edge?.node)
  );

  return lands;
};

// export const get_owned_lands = async (address: string) => {
//   const lands = await fetchGraphQL(TORII_URL + "/graphql", land_query, {}).then(
//     (res: any) =>
//       res?.ponziLandLandModels?.edges?.map((edge: any) => edge?.node)
//   );

//   if (!lands) {
//     return "You do not own any lands";
//   }

//   return lands;
// };

export const calculateLandYield = async (
  land: Land,
  tokens: TokenPrice[],
  { viewContract }: ClientsContext
) => {
  const token = getTokenData(land.token_used, tokens);

  console.log({ token });

  if (!token) {
    throw new Error("Token data not found");
  }

  let tax_rate = Number(
    await viewContract.get_tax_rate_per_neighbor(land.location)
  );

  console.log("tax rate", tax_rate);

  if (token.ratio) {
    tax_rate = tax_rate * token.ratio;
  }

  const neighbors = await viewContract.get_neighbors(land.location);

  console.log({ neighbors });

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

  console.log({ neighbor_tax_rates });

  console.log("tax_rate", tax_rate);
  for (const [index, neighbor] of neighbors.entries()) {
    if (neighbor.activeVariant() !== "Land") continue;
    const value = neighbor.unwrap();
    const neighbor_yield = neighbor_tax_rates[index];
    const neighbor_token = getTokenData(value.token_used, tokens);
    if (!neighbor_token) continue;
    // Yield is in estark
    if (!neighbor_token.ratio) {
      income += BigInt(neighbor_yield);
    } else {
      const adjusted_yield = Math.floor(
        Number(neighbor_yield) / neighbor_token.ratio
      );
      income += BigInt(adjusted_yield);
    }
  }

  console.log({ income });

  return income;

  // if (tax_rate == 0) {
  //   return 0;
  // }

  // const adjusted_income = BigInt(income) / BigInt(tax_rate);
  // console.log("adjusted income", adjusted_income);

  // return `
  // Income: ${formatTokenAmount(income)} estark
  // <detailed_income>
  // ${detailed_income}
  // </detailed_income>
  // Tax Rate: ${formatTokenAmount(BigInt(tax_rate))}
  // Net Yield: ${adjusted_income * BigInt(100)}% ( ${formatTokenAmount(income - BigInt(tax_rate))} estark)
  // `;
};

export const get_prices = async () => {
  const tokens = await getAllTokensFromAPI();
  return tokens;
};
