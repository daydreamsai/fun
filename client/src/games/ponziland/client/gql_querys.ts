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
    ponziLandAuctionModels(where: { is_finished: false }, limit: 100) {
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
    ponziLandLandModels(where: $where, limit: 100) {
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
    ponziLandLandModels(where: { stake_amount: "0" }, limit: 100) {
      edges {
        node {
          location
        }
      }
    }
  }
`;

export const entity_updated_subscription = /* GraphQL */ `
  subscription {
    entityUpdated {
      id
      keys
      eventId
      models {
        __typename
        ... on ponzi_land_NewAuctionEvent {
          land_location
          start_price
          floor_price
        }
        ... on ponzi_land_AddStakeEvent {
          land_location
          new_stake_amount
          owner
        }
        ... on ponzi_land_LandBoughtEvent {
          land_location
          sold_price
          token_used
          buyer
          seller
        }
      }
    }
  }
`;
