import {
  context,
  action,
  extension,
  formatXml,
  formatValue,
  XMLElement,
  xml,
} from "@daydreamsai/core";
import { string, z } from "zod";
import { useSettingsStore } from "@/store/settingsStore";
import { GameClient } from "./client/GameClient";
import { useTemplateStore } from "@/store/templateStore";
import { GetSkillsProgressResponse } from "./client/types/responses";
import { jsonPath } from "@/lib/jsonPath";
import { GameData, GigaverseState } from "./client/types/game";
import {
  defaultInstructions,
  defaultRules,
  dungeonSection,
  template,
} from "./prompts";
import { ActionPayload } from "./client/types/requests";
import { Cache } from "@/agent/utils/cache";
import { parseDungeonState, parseItems } from "./utils";

// Get the token directly from the store for better reactivity
export const getGigaToken = () => useSettingsStore.getState().gigaverseToken;
export const getAbstractAddress = () =>
  useSettingsStore.getState().abstractAddress;

export const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/gigaverse-api";
  }

  return "https://fun-production-4656.up.railway.app/api";
};

export type GigaverseContext = typeof gigaverseContext;

async function fetchGigaverseState(
  client: GameClient,
  data: GameData,
  address: string,
  fetchDungeon: boolean = true
): Promise<GigaverseState> {
  const energy = await client.getEnergy(address);
  const juice = await client.getJuice(address);
  const userBalances = await client.getUserBalances();
  const consumables = parseItems(userBalances, data.items, data.offchain, true);
  const balances = parseItems(userBalances, data.items, data.offchain);

  const dungeon = fetchDungeon
    ? parseDungeonState(await client.fetchDungeonState())
    : undefined;

  return {
    energy,
    juice,
    dungeon,
    consumables,
    balances: balances,
    lastUpdate: Date.now(),
  };
}

async function fetchDungeonState(
  client: GameClient
): Promise<GigaverseState["dungeon"]> {
  return parseDungeonState(await client.fetchDungeonState());
}

export const gigaverseContext = context({
  type: "gigaverse",
  schema: {
    id: string(),
  },
  key: ({ id }) => id,
  maxSteps: 100,
  maxWorkingMemorySize: 20,

  async setup(_, settings, agent) {
    const {
      gigaverseToken,
      abstractAddress: address,
      maxSteps,
      maxWorkingMemorySize,
    } = useSettingsStore.getState();

    settings.maxSteps = maxSteps;
    settings.maxWorkingMemorySize = maxWorkingMemorySize;

    const client = new GameClient(
      getApiBaseUrl(),
      gigaverseToken,
      agent.logger
    );

    const cache = agent.container.resolve<Cache>("cache");

    const { items, skills, offchain } = await cache.get(
      "gigaverse.data:v2",
      async () => {
        const items = await client.getAllGameItems();
        const skills = await client.getAllSkills();
        const offchain = await client.getStatic();

        return {
          items,
          skills,
          offchain,
        };
      }
    );

    const today = await client.getToday();

    const account = await client.getAccount(address);

    const faction = await client.getFaction(address);

    const playerSkills: GetSkillsProgressResponse =
      await client.getHeroSkillsProgress(account.noob.docId);

    const userBalances = await client.getUserBalances();

    const balances = parseItems(userBalances, items, offchain);

    const consumables = parseItems(userBalances, items, offchain, true);

    return {
      address,
      client,
      game: {
        items,
        skills,
        offchain,
        player: {
          account,
          faction,
          skills: playerSkills,
          balances,
          consumables,
        },
        today,
      },
      actionToken: "" as string | number,
    };
  },

  async create({ options }): Promise<GigaverseState> {
    const memory = await fetchGigaverseState(
      options.client,
      options.game,
      options.address,
      true
    );
    return memory;
  },

  async loader(state, _agent) {
    const { maxSteps, maxWorkingMemorySize } = useSettingsStore.getState();

    state.settings.maxSteps ??= maxSteps;
    state.settings.maxWorkingMemorySize ??= maxWorkingMemorySize;

    if (
      state.memory.dungeon &&
      state.memory.lastUpdate &&
      Date.now() - state.memory.lastUpdate < 10 * 1000
    ) {
      console.log("using cache");
      return;
    } else {
      console.log("skipping cache");
    }

    const dungeon = await fetchDungeonState(state.options.client);

    if (dungeon) {
      state.memory.dungeon = dungeon;
      if (dungeon.player.health.current === 0) {
        state.memory.energy = await state.options.client.getEnergy(
          state.options.address
        );
      }
    } else {
      state.memory = await fetchGigaverseState(
        state.options.client,
        state.options.game,
        state.options.address,
        false
      );
    }
  },

  shouldContinue(ctx) {
    if (ctx.memory.dungeon && ctx.memory.dungeon.player.health.current > 0) {
      return true;
    }
    return false;
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
        children: game.offchain.enemies.map((enemy) => ({
          name: enemy.NAME_CID,
          room: parseInt(enemy.ID_CID),
          stats: enemy.MOVE_STATS_CID_array,
        })),
      },
    ]);

    const hero = xml("hero", undefined, [
      {
        id: parseInt(game.player.account.noob.docId),
        skills: game.player.skills.entities.map((skillTree) => ({
          id: skillTree.SKILL_CID,
          level: skillTree.LEVEL_CID,
          statsUpgrades: skillTree.LEVEL_CID_array,
        })),
      },
    ]);

    const inventory = xml(
      "inventory",
      undefined,
      [
        ...memory.balances,
        // ...memory.consumables
      ].filter((t) => t.balance > 0 && t.item.type !== "Consumable")
    );

    const consumables = xml(
      "consumables",
      undefined,
      [...memory.consumables].filter((t) => t.balance > 0)
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
        formatXml(consumables),
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
        const enemyHealth = memory.dungeon?.enemy.health?.current ?? 0;

        if (action.startsWith("loot_") && enemyHealth > 0) {
          return {
            success: false,
            error: "Enemy is still alive you are not in the loot phase yet.",
          };
        }

        if (memory.dungeon?.lootPhase && !action.startsWith("loot_")) {
          return {
            success: false,
            error: "You are in loot phase you must pick a loot action",
          };
        }

        function isAction(
          actionName: typeof action
        ): actionName is "rock" | "paper" | "scissor" {
          return !actionName.startsWith("loot_");
        }

        if (
          isAction(action) &&
          memory.dungeon?.player[action].currentCharges! <= 0
        ) {
          return {
            success: false,
            error: "You dont have charges for this move",
          };
        }

        const currentTime = Date.now();
        const threeMinutesInMs = 3 * 60 * 1000;

        const payload: ActionPayload = {
          action,
          actionToken,
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
          dungeonId: 0,
        };

        let response = await options.client.playMove(payload);

        if (
          !response.success &&
          response.message.includes("Error: Invalid action token") &&
          response.actionToken
        ) {
          console.log("retrying with new action token...");
          response = await options.client.playMove({
            ...payload,
            actionToken: response.actionToken,
          });
        }

        if (response.actionToken) {
          options.actionToken = response.actionToken;
        }

        if (!response.success) {
          throw new Error(
            `Attack action failed with message: ${response.message}`
          );
        }

        const oldState = memory.dungeon!;
        const state = parseDungeonState(response)!;

        memory.dungeon = state;
        memory.lastUpdate = Date.now();

        if (action.startsWith("loot")) {
          return {
            success: true,
            message: response.message,
            result: response.data,
            previousLootOptions: oldState.lootOptions,
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
  - Requirements: 
    - 150 Giga Shards (itemId: 3)

    `,
    // # Consumables
    // Consumables selected will be brought into battle.
    // You can only select items from <consumables>.
    // You can select one consumable, to use more you need special gear.
    // Important:
    // All items brought into battle that are unsed will be lost upon death.
    // Dont use any other type of item, only use consumables. If you are not sure dont use it.
    schema: {
      dungeonId: z
        .number()
        .default(1)
        .describe("The ID of the dungeon to start."),
      // consumables: z.number().array().describe("The IDs of the consumables"),
    },
    async handler(data, ctx) {
      try {
        const { dungeonId } = data;

        const payload = {
          action: "start_run",
          actionToken: ctx.options.actionToken,
          dungeonId,
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
        };

        const response = await ctx.options.client.startRun(payload);

        if (response.actionToken) {
          ctx.options.actionToken = response.actionToken;
        }

        if (!response.success) {
          throw new Error(
            `Start new run failed with status ${response.success}`
          );
        }

        const state = parseDungeonState(response);

        ctx.memory.dungeon = state;
        ctx.memory.energy = await ctx.options.client.getEnergy(
          ctx.options.address
        );
        ctx.memory.lastUpdate = Date.now();

        return {
          success: true,
          result: response.data,
          message: `Successfully started a new run in dungeon ${dungeonId}`,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error starting new run:", error);

        ctx.memory = await fetchGigaverseState(
          ctx.options.client,
          ctx.options.game,
          ctx.options.address
        );
        ctx.options.actionToken = "";

        return {
          success: false,
          error: errorMessage,
          message:
            "Failed to start a new dungeon run, check your energy levels and dungeon energy requirements",
        };
      }
    },
  }),
  action({
    enabled: () => false,
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

      if (response.actionToken) {
        options.actionToken = response.actionToken;
      }

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
    enabled: () => false,
    name: "gigaverse.levelup",
    schema: {
      skillId: z.number(),
      statId: z.number(),
    },
    async handler({ skillId, statId }, { options: { client, game } }) {
      const noobId = parseInt(game.player.account.noob.docId);

      const response = await client.levelUp({
        noobId,
        skillId,
        statId,
      });

      if (!response.success) {
        return {
          success: false,
          result: response.data,
          message: response.message,
        };
      }

      const skills = await client.getHeroSkillsProgress(noobId);
      game.player.skills = skills;

      return {
        success: true,
        result: skills,
        message: response.message,
      };
    },
  }),
  // action({
  //   enabled: () => false,
  //   name: "gigaverse.marketplace.listings",
  //   schema: {
  //     itemId: z.number(),
  //   },
  //   async handler() {
  //     // https://gigaverse.io/api/marketplace/eth/player/0xBfe67820C7aA9bC167fb2ED2EdDE0dABdF1d3c20
  //     // https://gigaverse.io/api/marketplace/item/listing/item/151
  //   },
  // }),
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
    .replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, key: string) => {
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
