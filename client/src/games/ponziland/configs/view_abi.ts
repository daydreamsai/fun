export const view_abi = [
  {
    type: "impl",
    name: "player_actions__ContractImpl",
    interface_name: "dojo::contract::interface::IContract",
  },
  {
    type: "interface",
    name: "dojo::contract::interface::IContract",
    items: [],
  },
  {
    type: "impl",
    name: "player_actions__DeployedContractImpl",
    interface_name: "dojo::meta::interface::IDeployedResource",
  },
  {
    type: "struct",
    name: "core::byte_array::ByteArray",
    members: [
      {
        name: "data",
        type: "core::array::Array::<core::bytes_31::bytes31>",
      },
      {
        name: "pending_word",
        type: "core::felt252",
      },
      {
        name: "pending_word_len",
        type: "core::integer::u32",
      },
    ],
  },
  {
    type: "interface",
    name: "dojo::meta::interface::IDeployedResource",
    items: [
      {
        type: "function",
        name: "dojo_name",
        inputs: [],
        outputs: [
          {
            type: "core::byte_array::ByteArray",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "impl",
    name: "PlayerActionsImpl",
    interface_name: "orchard::systems::view::IPlayerActions",
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      {
        name: "low",
        type: "core::integer::u128",
      },
      {
        name: "high",
        type: "core::integer::u128",
      },
    ],
  },
  {
    type: "enum",
    name: "orchard::ponziland::models::Level",
    variants: [
      {
        name: "Zero",
        type: "()",
      },
      {
        name: "First",
        type: "()",
      },
      {
        name: "Second",
        type: "()",
      },
    ],
  },
  {
    type: "struct",
    name: "orchard::ponziland::models::Land",
    members: [
      {
        name: "location",
        type: "core::integer::u16",
      },
      {
        name: "block_date_bought",
        type: "core::integer::u64",
      },
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "sell_price",
        type: "core::integer::u256",
      },
      {
        name: "token_used",
        type: "core::starknet::contract_address::ContractAddress",
      },
      {
        name: "level",
        type: "orchard::ponziland::models::Level",
      },
    ],
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      {
        name: "False",
        type: "()",
      },
      {
        name: "True",
        type: "()",
      },
    ],
  },
  {
    type: "enum",
    name: "core::option::Option::<core::integer::u256>",
    variants: [
      {
        name: "Some",
        type: "core::integer::u256",
      },
      {
        name: "None",
        type: "()",
      },
    ],
  },
  {
    type: "struct",
    name: "orchard::ponziland::models::Auction",
    members: [
      {
        name: "land_location",
        type: "core::integer::u16",
      },
      {
        name: "start_time",
        type: "core::integer::u64",
      },
      {
        name: "start_price",
        type: "core::integer::u256",
      },
      {
        name: "floor_price",
        type: "core::integer::u256",
      },
      {
        name: "is_finished",
        type: "core::bool",
      },
      {
        name: "decay_rate",
        type: "core::integer::u16",
      },
      {
        name: "sold_at_price",
        type: "core::option::Option::<core::integer::u256>",
      },
    ],
  },
  {
    type: "enum",
    name: "orchard::ponziland::models::LandOrAuction",
    variants: [
      {
        name: "None",
        type: "()",
      },
      {
        name: "Land",
        type: "orchard::ponziland::models::Land",
      },
      {
        name: "Auction",
        type: "orchard::ponziland::models::Auction",
      },
    ],
  },
  {
    type: "interface",
    name: "orchard::systems::view::IPlayerActions",
    items: [
      {
        type: "function",
        name: "get_neighbors",
        inputs: [
          {
            name: "location",
            type: "core::integer::u16",
          },
        ],
        outputs: [
          {
            type: "core::array::Array::<orchard::ponziland::models::LandOrAuction>",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_land_or_auction",
        inputs: [
          {
            name: "location",
            type: "core::integer::u16",
          },
        ],
        outputs: [
          {
            type: "orchard::ponziland::models::LandOrAuction",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "get_tax_rate_per_neighbor",
        inputs: [
          {
            name: "location",
            type: "core::integer::u16",
          },
        ],
        outputs: [
          {
            type: "core::integer::u256",
          },
        ],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "can_level_up",
        inputs: [
          {
            name: "location",
            type: "core::integer::u16",
          },
        ],
        outputs: [
          {
            type: "core::bool",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "function",
    name: "dojo_init",
    inputs: [],
    outputs: [],
    state_mutability: "view",
  },
  {
    type: "impl",
    name: "WorldProviderImpl",
    interface_name:
      "dojo::contract::components::world_provider::IWorldProvider",
  },
  {
    type: "struct",
    name: "dojo::world::iworld::IWorldDispatcher",
    members: [
      {
        name: "contract_address",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
  },
  {
    type: "interface",
    name: "dojo::contract::components::world_provider::IWorldProvider",
    items: [
      {
        type: "function",
        name: "world_dispatcher",
        inputs: [],
        outputs: [
          {
            type: "dojo::world::iworld::IWorldDispatcher",
          },
        ],
        state_mutability: "view",
      },
    ],
  },
  {
    type: "impl",
    name: "UpgradeableImpl",
    interface_name: "dojo::contract::components::upgradeable::IUpgradeable",
  },
  {
    type: "interface",
    name: "dojo::contract::components::upgradeable::IUpgradeable",
    items: [
      {
        type: "function",
        name: "upgrade",
        inputs: [
          {
            name: "new_class_hash",
            type: "core::starknet::class_hash::ClassHash",
          },
        ],
        outputs: [],
        state_mutability: "external",
      },
    ],
  },
  {
    type: "constructor",
    name: "constructor",
    inputs: [],
  },
  {
    type: "event",
    name: "dojo::contract::components::upgradeable::upgradeable_cpt::Upgraded",
    kind: "struct",
    members: [
      {
        name: "class_hash",
        type: "core::starknet::class_hash::ClassHash",
        kind: "data",
      },
    ],
  },
  {
    type: "event",
    name: "dojo::contract::components::upgradeable::upgradeable_cpt::Event",
    kind: "enum",
    variants: [
      {
        name: "Upgraded",
        type: "dojo::contract::components::upgradeable::upgradeable_cpt::Upgraded",
        kind: "nested",
      },
    ],
  },
  {
    type: "event",
    name: "dojo::contract::components::world_provider::world_provider_cpt::Event",
    kind: "enum",
    variants: [],
  },
  {
    type: "event",
    name: "orchard::systems::view::player_actions::Event",
    kind: "enum",
    variants: [
      {
        name: "UpgradeableEvent",
        type: "dojo::contract::components::upgradeable::upgradeable_cpt::Event",
        kind: "nested",
      },
      {
        name: "WorldProviderEvent",
        type: "dojo::contract::components::world_provider::world_provider_cpt::Event",
        kind: "nested",
      },
    ],
  },
] as const;
