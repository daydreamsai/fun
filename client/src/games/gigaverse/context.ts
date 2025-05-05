import {
  context,
  action,
  extension,
  formatXml,
  formatValue,
  XMLElement,
  service,
  AnyAgent,
  xml,
} from "@daydreamsai/core";
import { string, z } from "zod";
import { useSettingsStore } from "@/store/settingsStore";
import { GameClient, OffchainItems } from "./client/GameClient";
import { useTemplateStore } from "@/store/templateStore";
import {
  BaseResponse,
  GetAllEnemiesResponse,
  GetAllGameItemsResponse,
  GetAllSkillsResponse,
  GetBalancesResponse,
  GetConsumablesResponse,
  GetNoobsResponse,
  GetSkillsProgressResponse,
} from "./client/types/responses";
import { jsonPath } from "@/lib/jsonPath";
import { Player } from "./client/types/game";
import {
  defaultInstructions,
  defaultRules,
  dungeonSection,
  playerSection,
  template,
} from "./prompts";
import { ActionPayload } from "./client/types/requests";
import { Cache } from "@/agent/utils/cache";
import docs from "./docs/main.md?raw";

// Get the token directly from the store for better reactivity
export const getGigaToken = () => useSettingsStore.getState().gigaverseToken;
export const getAbstractAddress = () =>
  useSettingsStore.getState().abstractAddress;

// Add a helper function to get the API base URL
export const getApiBaseUrl = () => {
  // In development, use the Vite proxy
  if (import.meta.env.DEV) {
    return "/gigaverse-api";
  }

  return "https://proxy-production-0fee.up.railway.app/api";
};

// Define an interface for the state (template removed)
export interface GigaverseDungeonState {
  currentDungeon: number;
  currentRoom: number;
  currentEnemy: number;

  player: Player;
  items: number[];

  enemy: Player;

  lootPhase: boolean;
  lootOptions: any[];

  lastBattleResult: string | null;
}

export type ItemBalance = {
  item: {
    id: number;
    name: string;
    description: string;
    type: string;
  };
  balance: number;
};

export type GigaverseState = {
  energy: number;
  consumables: ItemBalance[];
  balances: ItemBalance[];
  dungeon: GigaverseDungeonState | undefined;
};

export type GameData = {
  items: GetAllGameItemsResponse;
  enemies: GetAllEnemiesResponse;
  skills: GetAllSkillsResponse;
  offchain: {
    items: { entities: OffchainItems[] };
  };
  player: {
    noobs: GetNoobsResponse;
    skills: GetSkillsProgressResponse[];
  };
};

export type GigaverseContext = typeof gigaverseContext;

function parseDungeonState(
  response: BaseResponse
): GigaverseDungeonState | undefined {
  if (!response.data?.run || !response.data?.entity) return undefined;

  const [player, enemy] = response.data.run.players; // First player is the user

  let lastBattleResult: any = null;

  // Determine battle result based on thisPlayerWin and otherPlayerWin properties
  if (player.thisPlayerWin === true) {
    lastBattleResult = "win";
  } else if (enemy.thisPlayerWin === true) {
    lastBattleResult = "lose";
  } else if (enemy.lastMove) {
    lastBattleResult = "draw";
  }

  return {
    currentRoom: response.data.entity.ROOM_NUM_CID,
    currentDungeon: response.data.entity.DUNGEON_ID_CID,
    currentEnemy: response.data.entity.ENEMY_CID,

    player,

    items: response.data.entity.GAME_ITEM_ID_CID_array,

    enemy,

    lastBattleResult,

    lootOptions: response.data.run.lootOptions,
    lootPhase: response.data.run.lootPhase,
  };
}

function parseItems(
  consumables: GetConsumablesResponse | GetBalancesResponse,
  data: GameData
): ItemBalance[] {
  return consumables.entities.map((entity) => {
    const { docId, NAME_CID } = data.items.entities.find(
      (item) => item.docId === entity.ID_CID
    )!;
    const { DESCRIPTION_CID, TYPE_CID } = data.offchain.items.entities.find(
      (item) => item.docId === entity.ID_CID
    )!;

    return {
      item: {
        id: parseInt(docId),
        name: NAME_CID,
        description: DESCRIPTION_CID,
        type: TYPE_CID,
      },
      balance: entity.BALANCE_CID,
    };
  });
}

async function fetchGigaverseState(
  client: GameClient,
  data: GameData,
  address: string
): Promise<GigaverseState> {
  const energy = await client.getEnergy(address);
  const consumables = parseItems(await client.getConsumables(address), data);
  const balances = parseItems(await client.getUserBalances(address), data);
  const dungeon = parseDungeonState(await client.fetchDungeonState());

  return {
    energy,
    dungeon,
    consumables,
    balances,
  };
}

function renderSections(sections: Record<string, any>, data: any) {}

// Context for the agent
export const gigaverseContext = context({
  type: "gigaverse",
  schema: {
    id: string(),
  },
  key: ({ id }) => id,
  maxSteps: 100,
  maxWorkingMemorySize: 20,

  async setup(_, __, agent) {
    const authToken = getGigaToken();
    const address = getAbstractAddress();
    const client = new GameClient(getApiBaseUrl(), authToken, agent.logger);

    const cache = agent.container.resolve<Cache>("cache");

    const { items, enemies, skills, offchain } = await cache.get(
      "gigaverse.data",
      async () => {
        const items = await client.getAllGameItems();
        const enemies = await client.getAllEnemies();
        const skills = await client.getAllSkills();

        const offchain = {
          items: await client.getAllItemsOffchain(),
        };

        return {
          items,
          enemies,
          skills,
          offchain,
        };
      }
    );

    const noobs = await client.getNoobs(address);

    const playerSkills: GetSkillsProgressResponse[] = [];

    for (const noob of noobs.entities) {
      playerSkills.push(await client.getHeroSkillsProgress(noob.docId));
    }

    const game: GameData = {
      items,
      enemies,
      skills,
      offchain,
      player: {
        noobs,
        skills: playerSkills,
      },
    };

    return {
      address,
      client,
      game,
      actionToken: "",
    };
  },

  async create({ options }): Promise<GigaverseState> {
    const memory = await fetchGigaverseState(
      options.client,
      options.game,
      options.address
    );
    return memory;
  },

  async loader(state, _agent) {
    state.memory = await fetchGigaverseState(
      state.options.client,
      state.options.game,
      state.options.address
    );
  },

  render({ memory, options: { game } }) {
    const { selected, templates } = useTemplateStore.getState();

    // Get the current template from the Zustand store
    const rulesTemplate = selected.gigaverse?.rules
      ? templates.gigaverse.find((t) => t.id === selected.gigaverse?.rules)
          ?.prompt
      : defaultRules;

    const instructionsTemplate = selected.gigaverse?.instructions
      ? templates.gigaverse.find(
          (t) => t.id === selected.gigaverse?.instructions
        )?.prompt
      : defaultInstructions;

    const sectionsVariables = {
      energy: memory.energy,
      ...memory.dungeon,
    };

    const rules = rulesTemplate ? render(rulesTemplate, sectionsVariables) : "";
    const instructions = instructionsTemplate
      ? render(instructionsTemplate, sectionsVariables)
      : "";

    const gameData = xml("game_data", undefined, [
      {
        tag: "skills",
        children: game.skills.entities.map((skill) => ({
          id: parseInt(skill.docId),
          name: skill.NAME_CID,
          stats: skill.stats.map((stat) => ({
            id: stat.id,
            key: stat.increaseKey,
            name: stat.name,
            description: stat.desc,
            upgradeAmount: stat.increaseValue,
          })),
        })),
      },
      {
        tag: "enemies",
        children: game.enemies.entities.map((enemy) => ({
          name: enemy.NAME_CID,
          room: parseInt(enemy.ID_CID),
          stats: enemy.MOVE_STATS_CID_array,
        })),
      },
    ]);

    const hero = xml("hero", undefined, [
      {
        id: parseInt(game.player.noobs.entities[0].docId),
        skills: game.player.skills[0].entities.map((skillTree) => ({
          id: skillTree.SKILL_CID,
          level: skillTree.LEVEL_CID,
          statsUpgrades: skillTree.LEVEL_CID_array,
        })),
      },
    ]);

    const inventory = xml(
      "inventory",
      undefined,
      [...memory.balances, ...memory.consumables].filter((t) => t.balance > 0)
    );

    // Use the template from the store
    const prompt = render(template, {
      ...memory,
      rules: render(rules ?? "", sectionsVariables),
      instructions: render(instructions ?? "", sectionsVariables),

      state: [
        formatXml(gameData),
        formatXml(hero),
        formatXml(inventory),
        memory.dungeon ? render(dungeonSection, sectionsVariables) : null,
      ]
        .filter((t) => !!t)
        .join("\n"),
    });

    return prompt;
  },
}).setActions([
  /**
   * Action to attack in the rock-paper-scissors game
   */
  action({
    name: "gigaverse.attackInDungeon",
    description:
      "Attack in the dungeon. Use this when you are in the dungeon and you want to attack an enemy or you want to collect loot.",
    instructions: `\
Use this to make an action in a dungeon. 
If the lootPhase == true then you can select the Loot option, which will then take you to the next phase. 
If the lootPhase == false then you can select the Rock, Paper, Scissors option.`,
    schema: {
      action: z.enum([
        "rock",
        "paper",
        "scissor",
        "loot_one",
        "loot_two",
        "loot_three",
      ]),
    },
    async handler({ action }, { memory, options }, _agent) {
      try {
        const actionToken = options.actionToken ?? "";
        const currentTime = Date.now();
        const threeMinutesInMs = 3 * 60 * 1000;

        const payload: ActionPayload = {
          action,
          actionToken:
            currentTime - parseInt(actionToken) > threeMinutesInMs
              ? ""
              : actionToken,
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
          dungeonId: 0,
        };

        const response = await options.client.playMove(payload);

        if (!response.success) {
          throw new Error(
            `Attack action failed with status ${response.success}`
          );
        }

        const oldState = memory.dungeon!;
        const state = parseDungeonState(response)!;
        memory.dungeon = state;
        options.actionToken = response.actionToken?.toString() ?? "";

        if (action.startsWith("loot")) {
          return {
            success: true,
            message: response.message,
            result: response.data,
            lootOptions: oldState.lootOptions,
          };
        }

        return {
          success: true,
          result: response.data,
          gameItemBalanceChanges: response.gameItemBalanceChanges,
          message: `\
Successfully performed ${action} attack

Enemy Move: ${state.enemy.lastMove}
Battle Result: ${state.lastBattleResult}

Player Health: ${state.player.health.current}
Player Shield: ${state.player.shield.current}

Enemy Health: ${state.enemy.health.current}
Enemy Shield: ${state.enemy.shield.current}
`,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error performing attack action:", error);

        options.actionToken = "";

        return {
          success: false,
          error: errorMessage,
          message: "Failed to perform attack action",
        };
      }
    },
  }),
  /**
   * Action to start a new dungeon run
   */
  action({
    name: "gigaverse.startNewRun",
    description:
      "Start a new dungeon run. Use this when the player dies or wants to start a new run from outside the dungeon.",
    instructions: `\
# Dungeons

## Gigatron 5000
 - DungeonId: 1
 - Costs: 40 Energy
 - Skill tree: Dungetron 5000
## Gigus Mode
  - DungeonId: 2
  - Costs: 200 Energy
  - Skill tree: Dungetron 5000
## Underhaul
  - DungeonId: 3
  - Costs: 40 Energy
  - Skill tree: Dungetron Underhaul
  - Requeriments: 
    - 150 Giga Shards (itemId: 3)
`,
    schema: {
      dungeonId: z
        .number()
        .default(1)
        .describe("The ID of the dungeon to start."),
      consumables: z
        .number()
        .array()
        .describe(
          "The ID of the consumables to use during the dungeon, all items will be lost after the run even if not used"
        ),
    },
    async handler(data, ctx) {
      try {
        const { dungeonId, consumables } = data;

        const payload = {
          action: "start_run",
          actionToken: ctx.options.actionToken,
          dungeonId,
          data: {
            consumables,
            itemId: 0,
            index: 0,
          },
        };

        const response = await ctx.options.client.startRun(payload);

        if (!response.success) {
          throw new Error(
            `Start new run failed with status ${response.success}`
          );
        }

        const state = parseDungeonState(response);

        ctx.memory.dungeon = state;
        ctx.options.actionToken = response.actionToken?.toString() ?? "";

        return {
          success: true,
          result: response.data,
          message: `Successfully started a new run in dungeon ${dungeonId}`,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error starting new run:", error);

        ctx.options.actionToken = "";

        return {
          success: false,
          error: errorMessage,
          message: "Failed to start a new dungeon run",
        };
      }
    },
  }),
  action({
    name: "gigaverse.useItem",
    description: "use item in the dungeon",
    instructions:
      "You can only use consumables you started the dungeon with. Id's are available in the <dungeon_player_items>",
    schema: {
      index: z.number().describe("the index from `<dungeon_player_items>`"),
      itemId: z.number(),
    },
    async handler({ index, itemId }, { options }) {
      const response = await options.client.useItem({
        dungeonId: 0,
        data: { index, itemId },
      });

      return {
        success: true,
        result: response.data,
        message: response.message,
      };
    },
  }),
  // action({
  //   enabled: () => false,
  //   name: "gigaverse.",
  // }),
  action({
    name: "gigaverse.levelup",
    instructions: ``,
    schema: {
      skillId: z.number(),
      statId: z.number(),
    },
    async handler({ skillId, statId }, { options }) {
      debugger;

      await options.client.levelUp({
        noobId: parseInt(options.game.player.noobs.entities[0].docId),
        skillId,
        statId,
      });
    },
  }),
  action({
    enabled: () => false,
    name: "gigaverse.marketplace.listings",
    schema: {
      itemId: z.number(),
    },
    async handler() {
      // https://gigaverse.io/api/marketplace/eth/player/0xBfe67820C7aA9bC167fb2ED2EdDE0dABdF1d3c20
      // https://gigaverse.io/api/marketplace/item/listing/item/151
    },
  }),
]);

// Create the Gigaverse agent with UI integration
export const giga = extension({
  name: "giga",
  contexts: {
    gigaverse: gigaverseContext,
  },
});

export function render<Template extends string>(str: Template, data: any) {
  return str
    .trim()
    .replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, key: string) => {
      const res = jsonPath(data, key);
      if (!res) return "";
      const [value] = res;
      if (typeof value === "object") {
        if (value && "tag" in value) return formatXml(value as XMLElement);
        if (value) return formatValue(value);
      }

      if (Array.isArray(value)) {
        return value
          .map((v) => {
            if (typeof v === "object" && v && "tag" in v) {
              return formatXml(v);
            }
            return formatValue(v);
          })
          .join("\n");
      }

      return value ?? "";
    });
}
