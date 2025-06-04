export const balance_query = /* GraphQL */ `
  query GetTokenBalances($accountAddress: String!) {
    tokenBalances(accountAddress: $accountAddress) {
      edges {
        node {
          tokenMetadata {
            ... on ERC20__Token {
              symbol
              amount
              contractAddress
            }
          }
        }
      }
    }
  }
`;

export const auction_query = /* GraphQL */ `
  query GetActiveAuctions {
    ponziLandAuctionModels(where: { is_finished: false }) {
      edges {
        node {
          start_time
          is_finished
          start_price
          floor_price
          land_location
          decay_rate
        }
      }
    }
  }
`;

export const land_query = /* GraphQL */ `
  query GetOwnedLands($where: ponzi_land_LandWhereInput!) {
    ponziLandLandModels(where: $where) {
      edges {
        node {
          location
          sell_price
          token_used
          owner
        }
      }
    }
  }
`;

export const nuke_query = /* GraphQL */ `
  query GetNukeableLands {
    ponziLandLandModels(where: { stake_amount: "0" }) {
      edges {
        node {
          location
        }
      }
    }
  }
`;
