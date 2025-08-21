import { context, action, extension, formatXml, xml } from "@daydreamsai/core";
import { z } from "zod/v4";
import { useSettingsStore } from "@/store/settingsStore";
import { GameClient } from "./client/GameClient";
import {
  FishingActionData,
  FishingItemBalanceChanges,
} from "./client/types/game";
import { useTemplateStore } from "@/store/templateStore";
import { GetSkillsProgressResponse } from "./client/types/responses";
import {
  GameData,
  GigaverseState,
  ItemBalance,
  MarketplaceFloorResponse,
} from "./client/types/game";
import {
  defaultInstructions,
  defaultRules,
  dungeonSection,
  template,
  templateMinimal,
} from "./prompts";
import { ActionPayload } from "./client/types/requests";
import { Cache } from "@/agent/utils/cache";
import {
  parseBalanceChange,
  parseDungeonState,
  parseEquipedGear,
  parseItems,
} from "./utils";
import { render } from "./render";

export const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "/gigaverse-api";
  }

  return import.meta.env.VITE_GIGA_PROXY + "/gigaverse";
};

export type GigaverseContext = typeof gigaverseContext;

// Fonction utilitaire pour extraire les charges de façon consistante
function getPlayerCharges(player: any) {
  return {
    rock: player?.rock?.currentCharges ?? player?.rock?.charges,
    paper: player?.paper?.currentCharges ?? player?.paper?.charges,
    scissor: player?.scissor?.currentCharges ?? player?.scissor?.charges,
  };
}

async function fetchGigaverseState(
  client: GameClient,
  data: GameData,
  address: string,
  marketplaceFloor: MarketplaceFloorResponse,
  fetchDungeon: boolean = true
): Promise<GigaverseState> {
  const energy = await client.getEnergy(address);
  const juice = await client.getJuice(address);
  const userBalances = await client.getUserBalances();

  const fishingState = await client.getFishingState(address);
  const consumables = parseItems(
    userBalances,
    data.items,
    data.offchain,
    marketplaceFloor,
    true
  );
  const balances = parseItems(
    userBalances,
    data.items,
    data.offchain,
    marketplaceFloor
  );

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
    fishingState,
  };
}

async function fetchDungeonState(
  client: GameClient
): Promise<GigaverseState["dungeon"]> {
  return parseDungeonState(await client.fetchDungeonState());
}

export const gigaverseContext = context({
  type: "gigaverse",
  schema: z.object({
    id: z.string(),
  }),
  key: ({ id }) => id,
  maxSteps: 100,
  maxWorkingMemorySize: 20,
  async setup(args, settings, agent) {
    try {
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

      const marketplaceFloor = await client.getMarketplaceItemFloor();

      const today = await client.getToday();

      const account = await client.getAccount(address);

      const faction = await client.getFaction(address);

      const equipedGear = await client.getEquipedGear(account.noob.docId);

      const equipedGearParsed = parseEquipedGear(equipedGear, offchain);

      const playerSkills: GetSkillsProgressResponse =
        await client.getHeroSkillsProgress(account.noob.docId);

      const userBalances = await client.getUserBalances();

      const balances = parseItems(
        userBalances,
        items,
        offchain,
        marketplaceFloor
      );

      const consumables = parseItems(
        userBalances,
        items,
        offchain,
        marketplaceFloor,
        true
      );

      const energy = await client.getEnergy(address);

      const fishingState = await client.getFishingState(address);

      return {
        address,
        client,
        game: {
          items,
          skills,
          offchain,
          marketplaceFloor,
          player: {
            account,
            faction,
            skills: playerSkills,
            balances,
            consumables,
            energy,
            gear: equipedGearParsed,
          },
          today,
          fishingState,
        },
        actionToken: "" as string | number,
      };
    } catch (setupError) {
      console.error("❌ SETUP ERROR:", setupError);
      throw setupError;
    }
  },

  async create({ options }): Promise<
    GigaverseState & {
      gamesToPlay: number;
      fishingData: FishingActionData;
      fishingBalanceChanges: FishingItemBalanceChanges;
      currentHarvestedItems: ItemBalance[];
    }
  > {
    const memory = await fetchGigaverseState(
      options.client,
      options.game,
      options.address,
      options.game.marketplaceFloor,
      true
    );

    return {
      ...memory,
      gamesToPlay: 0,
      fishingData: {} as FishingActionData,
      fishingBalanceChanges: [],
      currentHarvestedItems: [],
    };
  },

  async loader(state, _agent) {
    const { maxSteps, maxWorkingMemorySize } = useSettingsStore.getState();

    state.options.game.player.energy = await state.options.client.getEnergy(
      state.options.address
    );

    state.settings.maxSteps ??= maxSteps;
    state.settings.maxWorkingMemorySize ??= maxWorkingMemorySize;

    // Use cache if data is fresh (< 10s old)
    if (
      state.memory.dungeon &&
      state.memory.lastUpdate &&
      Date.now() - state.memory.lastUpdate < 10 * 1000
    ) {
      return;
    }

    const dungeon = await fetchDungeonState(state.options.client);

    if (dungeon) {
      // Validate critical data before storing
      if (
        !dungeon.player ||
        !dungeon.player.rock ||
        dungeon.player.rock.currentCharges === undefined
      ) {
        console.error(
          "⚠️ Loader: Incomplete dungeon state from fetchDungeonState:",
          {
            hasPlayer: !!dungeon.player,
            hasPlayerRock: !!dungeon.player?.rock,
            rockCharges: dungeon.player?.rock?.currentCharges,
            playerStructure: Object.keys(dungeon.player || {}),
          }
        );
        // Don't store corrupted data
        return;
      }

      state.memory.dungeon = dungeon;
      if (dungeon.player.health.current === 0) {
        state.memory.energy = await state.options.client.getEnergy(
          state.options.address
        );
      }
    } else {
      const gigaverseState = await fetchGigaverseState(
        state.options.client,
        state.options.game,
        state.options.address,
        state.options.game.marketplaceFloor,
        false
      );

      state.memory = {
        ...state.memory,
        ...gigaverseState,
      };
    }
  },
  async onError(error, ctx) {
    console.error("❌ ERROR:", error.message);

    // If player died, provide helpful context
    if (ctx.memory?.dungeon?.player?.health?.current <= 0) {
      console.error("💀 Player died");
    }
  },

  shouldContinue(ctx) {
    // Player alive in dungeon - continue
    if (ctx.memory?.dungeon && ctx.memory.dungeon.player.health.current > 0) {
      return true;
    }

    // Player explicitly died - stop
    if (ctx.memory?.dungeon && ctx.memory.dungeon.player.health.current <= 0) {
      return false;
    }

    // Has energy and game context - continue to allow dungeon detection
    const hasEnergy = ctx.memory?.energy?.entities?.[0]?.parsedData?.energy > 0;
    const hasGameContext = !!ctx.options?.game;

    return hasEnergy && hasGameContext;
  },

  render({ memory, options: { game } }) {
    const { selected, templates } = useTemplateStore.getState();

    const instructionsTemplate =
      templates.gigaverse?.find(
        (t) => t.id === selected.gigaverse?.instructions
      )?.prompt || defaultInstructions;

    // Format available dungeons as text for template
    const availableDungeons = game.today.dungeonDataEntities
      .map(
        (dungeon) =>
          `**${dungeon.NAME_CID}** (ID: ${dungeon.ID_CID})
- Energy Cost: ${dungeon.ENERGY_CID}
- Checkpoint Required: ${dungeon.CHECKPOINT_CID}`
      )
      .join("\n\n");

    console.log("🏰 DEBUG: Available dungeons data:", {
      dungeonCount: game.today.dungeonDataEntities.length,
      dungeons: game.today.dungeonDataEntities.map((d) => ({
        id: d.ID_CID,
        name: d.NAME_CID,
        energy: d.ENERGY_CID,
      })),
      formattedText: availableDungeons,
    });

    // Always use the raw memory data for rendering - validation only at combat time
    const sectionsVariables = {
      energy: memory.energy?.entities?.[0]?.parsedData?.energy ?? 0,
      ...memory.dungeon,
      // Provide fallbacks for template rendering only
      currentDungeon: memory.dungeon?.currentDungeon ?? "none",
      currentRoom: memory.dungeon?.currentRoom ?? 0,
      lootPhase: memory.dungeon?.lootPhase ?? false,
      lastBattleResult: memory.dungeon?.lastBattleResult ?? "",
      player: memory.dungeon?.player ?? null,
      enemy: memory.dungeon?.enemy ?? null,
      lootOptions: memory.dungeon?.lootOptions ?? [],
      // Add formatted available dungeons
      availableDungeons,
    };

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
      [...memory.balances].filter(
        (t) => t.balance > 0 && t.item.type !== "Consumable"
      )
    );

    const consumables = xml(
      "consumables",
      undefined,
      [...memory.consumables].filter((t) => t.balance > 0)
    );

    // TODO: dev do in a different template
    // const fishingData = xml("fishing_data", undefined, [
    //   {
    //     tag: "fishing_data",
    //     children: memory.fishingData,
    //   },
    // ]);

    // const fishingBalanceChanges = xml("fishing_balance_changes", undefined, [
    //   {
    //     tag: "fishing_balance_changes",
    //     children: memory.fishingBalanceChanges,
    //   },
    // ]);

    // Include dungeon section only if we actually have dungeon data
    const shouldIncludeDungeonSection = !!memory.dungeon;

    console.log("🏰 DUNGEON SECTION DEBUG:", {
      hasDungeonInMemory: !!memory.dungeon,
      shouldIncludeDungeonSection,
      dungeonData: memory.dungeon
        ? {
            currentRoom: memory.dungeon.currentRoom,
            currentDungeon: memory.dungeon.currentDungeon,
            playerHealth: memory.dungeon.player?.health?.current,
          }
        : "NO_DUNGEON_DATA",
    });

    // 🔍 CHARGE DEBUG: Log render state
    if (!memory.dungeon) {
      console.log("📝 Rendering without dungeon data (normal at start)");
    } else {
      console.log("📝 RENDERING CHARGES:", {
        renderCharges: sectionsVariables.player ? getPlayerCharges(sectionsVariables.player) : null,
        memoryUpdate: memory.lastUpdate,
        renderTime: Date.now(),
      });
    }

    // Use the minimal template for testing (original backed up as templateOriginalBackup)
    const prompt = render(templateMinimal, {
      ...memory,
      ...sectionsVariables, // Add sectionsVariables to include availableDungeons
      instructions: render(instructions ?? "", sectionsVariables),
      dungeonSection: shouldIncludeDungeonSection
        ? render(dungeonSection, sectionsVariables)
        : "",
      state: [
        formatXml(hero),
        formatXml(inventory),
        formatXml(consumables),
        formatXml(gameData),
      ]
        .filter((t) => !!t)
        .join("\n"),
    });

    // Only log prompt in development or when debugging
    if (import.meta.env.DEV) {
      console.log(
        "🎯 FINAL PROMPT CONTAINS AVAILABLE DUNGEONS:",
        availableDungeons
      );
      console.log("Generated prompt:", prompt.substring(0, 1000) + "...");
    }

    return prompt;
  },
}).setActions([
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
      // 🔍 CHARGE DEBUG: Log current state BEFORE action
      console.log("🔍 BEFORE ACTION:", {
        action,
        playerCharges: memory.dungeon?.player ? getPlayerCharges(memory.dungeon.player) : null,
        playerHealth: memory.dungeon?.player?.health?.current,
        memoryUpdate: memory.lastUpdate,
      });

      try {
        // Check if player is dead before attempting any action
        const playerHealth = memory.dungeon?.player?.health?.current ?? 0;
        if (playerHealth <= 0) {
          console.log("💀 PLAYER DEATH DETECTED:", {
            playerHealth,
            memoryUpdate: memory.lastUpdate,
            timeSinceUpdate: Date.now() - (memory.lastUpdate || 0),
            dungeonExists: !!memory.dungeon,
            playerExists: !!memory.dungeon?.player,
          });
          return {
            success: false,
            error: "Player is dead. Cannot perform actions in dungeon.",
            message: "Your character has died. The run will end shortly.",
          };
        }

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
          const charges = getPlayerCharges(memory.dungeon.player);
          const currentCharges = charges[action];
          return {
            success: false,
            error: `You dont have charges for this move. ${action} has ${currentCharges} charges.`,
          };
        }

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

        // 🔍 CHARGE DEBUG: Log server response
        console.log("🔍 SERVER RESPONSE:", {
          hasRun: !!response.data?.run,
          hasPlayers: !!response.data?.run?.players,
          playersCount: response.data?.run?.players?.length,
          rawPlayerCharges: response.data?.run?.players?.[0]
            ? {
                rock: response.data.run.players[0].rock,
                paper: response.data.run.players[0].paper,
                scissor: response.data.run.players[0].scissor,
              }
            : "no player data",
        });

        const oldState = memory.dungeon!;
        const state = parseDungeonState(response);


        if (!state) {
          throw new Error(
            "❌ CRITICAL: parseDungeonState returned null after attack - server response corrupted"
          );
        }

        if (
          !state.player ||
          !state.player.rock ||
          state.player.rock.currentCharges === undefined
        ) {
          console.error("⚠️ Incomplete dungeon state after attack:", {
            hasPlayer: !!state.player,
            hasPlayerRock: !!state.player?.rock,
            rockStructure: state.player?.rock
              ? Object.keys(state.player.rock)
              : "no rock",
          });
          throw new Error("❌ CRITICAL: Incomplete player data after attack");
        }

        memory.dungeon = state;
        memory.lastUpdate = Date.now();

        // 🔍 CHARGE DEBUG: Log final memory state

        if (response.gameItemBalanceChanges) {
          const newItems = parseBalanceChange(
            response.gameItemBalanceChanges,
            options.game.offchain,
            options.game.marketplaceFloor
          );
          if (Array.isArray(memory.currentHarvestedItems)) {
            // Add new items to existing, avoiding duplicates by id+amount
            const existing = memory.currentHarvestedItems;
            const combined = [...existing];
            for (const newItem of newItems) {
              // Find if an item with same id and amount already exists
              const idx = combined.findIndex(
                (item) =>
                  item.item.id === newItem.item.id &&
                  item.balance === newItem.balance
              );
              if (idx === -1) {
                combined.push(newItem);
              }
            }
            memory.currentHarvestedItems = combined;
          } else {
            memory.currentHarvestedItems = newItems;
          }
        }

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
        console.error("❌ Attack action failed:", errorMessage);

        return {
          success: false,
          error: errorMessage,
          message: "Failed to perform attack action",
        };
      }
    },
  }),

  action({
    name: "gigaverse.startNewRun",
    description:
      "Start a new dungeon run. Use this when the player dies or wants to start a new run from outside the dungeon.",
    instructions: `\
IMPORTANT: Use the Available Dungeons section from the main template to get the correct dungeon IDs and energy costs. 
Do NOT use hardcoded values - the dungeon data is dynamic and changes.
Check your current energy level and select a dungeon you can afford.

The main template contains the real-time dungeon data with correct IDs, names, and energy costs.
    `,

    schema: {
      dungeonId: z
        .number()
        .describe(
          "The ID of the dungeon to start. Must choose from the Available Dungeons list in the prompt."
        ),
    },
    async handler(data, ctx) {
      // Refresh energy before attempting to start
      const freshEnergy = await ctx.options.client.getEnergy(
        ctx.options.address
      );

      // Log available dungeons for comparison
      const availableDungeons = ctx.options.game.today.dungeonDataEntities.map(
        (d) => ({
          id: d.ID_CID,
          name: d.NAME_CID,
          energy: d.ENERGY_CID,
          checkpoint: d.CHECKPOINT_CID,
        })
      );

      console.log("🆕 STARTING NEW RUN:", {
        chosenDungeonId: data.dungeonId,
        availableDungeons,
        currentEnergy: freshEnergy.entities?.[0]?.parsedData?.energy,
        gamesToPlay: ctx.memory.gamesToPlay,
        hasOldDungeon: !!ctx.memory.dungeon,
        oldPlayerHealth: ctx.memory.dungeon?.player?.health?.current,
      });

      try {
        const { dungeonId } = data;

        if (ctx.memory.gamesToPlay <= 0) {
          // Auto-recharge games for testing purposes
          console.log("⚡ Auto-recharging games...");
          ctx.memory.gamesToPlay = 5;
        }

        ctx.memory.gamesToPlay -= 1;

        const payload = {
          action: "start_run",
          actionToken: ctx.options.actionToken || "",
          dungeonId,
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
        };

        console.log("🚀 CALLING START RUN with payload:", payload);
        console.log("📍 Available action token:", {
          currentToken: ctx.options.actionToken,
          tokenLength: ctx.options.actionToken?.toString().length || 0,
        });

        let response = await ctx.options.client.startRun(payload);

        console.log("📋 FIRST RESPONSE:", {
          success: response.success,
          message: response.message,
          hasActionToken: !!response.actionToken,
          actionToken: response.actionToken,
        });

        // Enhanced token error handling for start_run
        if (
          !response.success &&
          (response.message.includes("Error handling action") ||
            response.message.includes("Invalid action token"))
        ) {
          console.log(
            "🔄 Token error detected for start_run:",
            response.message
          );

          if (response.actionToken && response.actionToken !== "") {
            console.log(
              "🔄 Retrying start_run with new token from response:",
              response.actionToken
            );
            response = await ctx.options.client.startRun({
              ...payload,
              actionToken: response.actionToken,
            });
          } else {
            // Try with empty token if server suggests it
            console.log("🔄 Retrying start_run with empty token...");
            response = await ctx.options.client.startRun({
              ...payload,
              actionToken: "",
            });
          }
        }

        if (response.actionToken) {
          ctx.options.actionToken = response.actionToken;
        }

        if (!response.success) {
          throw new Error(
            `Start new run failed with message: ${response.message}`
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

        const gigaverseState = await fetchGigaverseState(
          ctx.options.client,
          ctx.options.game,
          ctx.options.address,
          ctx.options.game.marketplaceFloor
        );

        ctx.memory = {
          ...ctx.memory,
          ...gigaverseState,
        };

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
  action({
    name: "gigaverse.startFishingRun",
    description: "Start a fishing run.",
    instructions: `\
You should only ever use this function if the user has asked you to start a fishing run.
`,

    schema: {
      cards: z
        .array(z.number())
        .optional()
        .describe("The id of the card to play, which is found in the deck"),
    },

    async handler({ cards }, { options }) {
      const response = await options.client.startFishingRun({
        action: "start_run",
        actionToken: options.actionToken
          ? options.actionToken
          : Date.now().toString(),
        data: {
          cards: [],
          nodeId: "0",
        },
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
  action({
    name: "gigaverse.playFishingCards",
    description: "Play fishing cards.",
    instructions: `\
Use this to play fishing cards.
`,
    schema: {
      cards: z
        .array(z.number())
        .describe(
          "The index of the card to play, which is found in the in your hand. "
        ),
    },
    async handler({ cards }, { options, memory }) {
      const response = await options.client.startFishingRun({
        action: "play_cards",
        actionToken: options.actionToken as string,
        data: {
          cards,
          nodeId: "",
        },
      });

      if (response.actionToken) {
        options.actionToken = response.actionToken;
      }

      memory.fishingData = response.data.doc.data;
      memory.fishingBalanceChanges = response.gameItemBalanceChanges;

      return {
        success: true,
        result: response.data,
        message: response.message,
      };
    },
  }),

  // action to add number of games to play
  action({
    name: "gigaverse.addGamesToPlay",
    description: "Add number of games to play.",
    instructions: `\
You should only ever use this function if the user has asked you to add games to play.
`,
    schema: {
      games: z.number(),
    },
    async handler({ games }, { memory }) {
      memory.gamesToPlay += Number(games);

      return {
        success: true,
        message: `Added ${games} games to play`,
      };
    },
  }),
]);

export const giga = extension({
  name: "giga",
  contexts: {
    gigaverse: gigaverseContext,
  },
});
