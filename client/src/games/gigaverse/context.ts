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
import { logger } from "@/utils/logger";

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

      // Fetch juice data for this player
      const juice = await client.getJuice(address);

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
            juice: juice, // Add the juice data to the player object
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

    // Format available dungeons as text for template with energy context
    const currentEnergy = memory.energy?.entities?.[0]?.parsedData?.energy || 0;
    const availableDungeons = game.today.dungeonDataEntities
      .map((dungeon) => {
        const canAfford = dungeon.ENERGY_CID <= currentEnergy;
        const affordabilityIcon = canAfford ? "✅" : "❌";
        const affordabilityText = canAfford ? "AFFORDABLE" : "TOO EXPENSIVE";
        
        return `${affordabilityIcon} **${dungeon.NAME_CID}** (ID: ${dungeon.ID_CID}) - ${affordabilityText}
- Energy Cost: ${dungeon.ENERGY_CID} (you have ${currentEnergy})
- Checkpoint Required: ${dungeon.CHECKPOINT_CID}`;
      })
      .join("\n\n");

    logger.debug("Available dungeons loaded", {
      count: game.today.dungeonDataEntities.length,
      dungeons: game.today.dungeonDataEntities.map((d) => ({
        id: d.ID_CID,
        name: d.NAME_CID,
        energy: d.ENERGY_CID,
      }))
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

    logger.debug("Dungeon section rendering", {
      hasDungeonInMemory: !!memory.dungeon,
      shouldIncludeDungeonSection,
      currentRoom: memory.dungeon?.currentRoom,
      currentDungeon: memory.dungeon?.currentDungeon,
      playerHealth: memory.dungeon?.player?.health?.current
    });

    // Log render state only in debug mode
    logger.debug("Render state", {
      hasDungeon: !!memory.dungeon,
      playerCharges: memory.dungeon?.player ? getPlayerCharges(memory.dungeon.player) : null,
      lastUpdate: memory.lastUpdate
    });

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

    // Log prompt details in debug mode only
    logger.debug("Prompt generated", {
      availableDungeonsLength: availableDungeons.length,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + "..."
    });

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
      // Debug log current state before action
      logger.debug("Action attempted", {
        action,
        playerCharges: memory.dungeon?.player ? getPlayerCharges(memory.dungeon.player) : null,
        playerHealth: memory.dungeon?.player?.health?.current
      });

      try {
        // Check if player is dead before attempting any action
        const playerHealth = memory.dungeon?.player?.health?.current ?? 0;
        if (playerHealth <= 0) {
          logger.warn("🏴 Player died in dungeon - cleaning up state", {
            playerHealth,
            timeSinceUpdate: Date.now() - (memory.lastUpdate || 0),
            dungeonId: memory.dungeon?.currentDungeon,
            oldActionToken: options.actionToken
          });

          // Clear the dungeon state AND action token so agent knows to start a new run
          memory.dungeon = undefined;
          memory.lastUpdate = Date.now();
          options.actionToken = ""; // Clear the old action token!

          logger.info("🧹 State cleaned up after death", {
            dungeonCleared: !memory.dungeon,
            actionTokenCleared: options.actionToken === "",
            readyForNewRun: true
          });

          return {
            success: false,
            error: "Player is dead. Dungeon state cleared.",
            message: `💀 Your character has died! Your run has ended.

🔄 To continue playing:
1. Start a new dungeon run using gigaverse.startNewRun
2. Choose a dungeon you have enough energy for
3. Begin your adventure again!

Current status: Ready for new run`,
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
          const lootOptions = memory.dungeon?.lootOptions || [];
          return {
            success: false,
            error: "You are in loot phase! You must pick a loot first.",
            message: `🎁 LOOT PHASE ACTIVE!

You defeated an enemy and need to choose your reward:
${lootOptions.map((option, i) => `  ${i + 1}. ${option.name} - ${option.description || 'Mystery reward'}`).join("\n")}

Use one of these actions:
• loot_one - Choose first reward
• loot_two - Choose second reward  
• loot_three - Choose third reward`,
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
          logger.info("Retrying action with new token");
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

        // Debug server response structure
        logger.debug("Action response received", {
          hasRun: !!response.data?.run,
          hasPlayers: !!response.data?.run?.players,
          success: response.success
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
        
        // CRITICAL DEBUG: Log detailed battle results
        logger.warn("🎯 ATTACK ACTION COMPLETED - STATE UPDATE", {
          action: action.toUpperCase(),
          battleResult: state?.lastBattleResult,
          wasInLootPhase: oldState?.lootPhase,
          nowInLootPhase: state?.lootPhase,
          playerHealth: `${state?.player?.health?.current}/${state?.player?.health?.currentMax}`,
          enemyHealth: `${state?.enemy?.health?.current}/${state?.enemy?.health?.currentMax}`,
          playerMove: state?.player?.lastMove,
          enemyMove: state?.enemy?.lastMove,
          hasLootOptions: !!(state?.lootOptions?.length),
          lootOptionsCount: state?.lootOptions?.length || 0,
          room: `${state?.currentRoom}/${state?.currentDungeon}`,
          charges: getPlayerCharges(state?.player)
        });

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
          logger.info("🎁 LOOT SELECTED", {
            lootChoice: action,
            lootPhase: state?.lootPhase,
            playerHealth: `${state?.player?.health?.current}/${state?.player?.health?.currentMax}`,
            enemyHealth: `${state?.enemy?.health?.current}/${state?.enemy?.health?.currentMax}`,
            room: `${state?.currentRoom}/${state?.currentDungeon}`,
            hasNextEnemy: !!(state?.enemy && state?.enemy?.health?.current > 0)
          });

          // Determine what happens after loot selection
          const postLootStatus = state?.lootPhase ? 
            "🎁 Still in loot phase - more rewards to choose!" :
            state?.enemy?.health?.current > 0 ? 
              "⚔️ Next enemy appeared! Ready for battle!" : 
              state?.currentRoom ? 
                `🚪 Advancing to room ${(state.currentRoom || 0) + 1}. New challenges await!` :
                "🏁 Dungeon section completed!";

          const nextAction = state?.lootPhase ? 
            "Choose another loot option." :
            state?.enemy?.health?.current > 0 ? 
              `🥊 Battle the new enemy!
Choose your attack:
🪨 rock (${state.player.rock.currentCharges}/${state.player.rock.maxCharges} charges)
📄 paper (${state.player.paper.currentCharges}/${state.player.paper.maxCharges} charges)  
✂️ scissor (${state.player.scissor.currentCharges}/${state.player.scissor.maxCharges} charges)` :
              "The dungeon continues! Keep exploring.";

          return {
            success: true,
            message: `🎉 LOOT OBTAINED: ${action.replace('_', ' ').toUpperCase()}!

${response.message}

${postLootStatus}

${nextAction}`,
            result: response.data,
            previousLootOptions: oldState.lootOptions,
          };
        }

        // Prepare battle summary message
        const battleSummary = `⚔️ ${action.toUpperCase()} ATTACK EXECUTED!

🔄 Battle Result: ${state.lastBattleResult}
👤 You used: ${state.player.lastMove || action}
👹 Enemy used: ${state.enemy.lastMove || 'unknown'}

💚 Player: ${state.player.health.current}/${state.player.health.currentMax} HP (🛡️ ${state.player.shield.current})
❤️ Enemy: ${state.enemy.health.current}/${state.enemy.health.currentMax} HP (🛡️ ${state.enemy.shield.current})

🏠 Room ${state.currentRoom} | Dungeon ${state.currentDungeon}`;

        const nextSteps = state.lootPhase ? 
          `🎉 VICTORY! Enemy defeated! 
🎁 Loot phase activated - choose your reward:
${state.lootOptions.map((option, i) => `  ${i + 1}. ${option.name} - ${option.description || 'Mystery reward'}`).join("\n")}

Use loot_one, loot_two, or loot_three to claim your prize!` : 
          `⚔️ BATTLE CONTINUES!
Choose your next move:
🪨 rock (${state.player.rock.currentCharges}/${state.player.rock.maxCharges} charges)
📄 paper (${state.player.paper.currentCharges}/${state.player.paper.maxCharges} charges)  
✂️ scissor (${state.player.scissor.currentCharges}/${state.player.scissor.maxCharges} charges)`;

        return {
          success: true,
          result: response.data,
          gameItemBalanceChanges: response.gameItemBalanceChanges,
          message: `${battleSummary}

${nextSteps}`,
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

      logger.info("Starting new dungeon run", {
        dungeonId: data.dungeonId,
        currentEnergy: freshEnergy.entities?.[0]?.parsedData?.energy,
        gamesToPlay: ctx.memory.gamesToPlay,
        hasOldDungeon: !!ctx.memory.dungeon
      });

      try {
        const { dungeonId } = data;
        const currentEnergy = freshEnergy.entities?.[0]?.parsedData?.energy || 0;

        if (ctx.memory.gamesToPlay <= 0) {
          // Auto-recharge games for testing purposes
          logger.debug("Auto-recharging games for testing");
          ctx.memory.gamesToPlay = 5;
        }

        ctx.memory.gamesToPlay -= 1;

        // For start_run, actionToken should typically be empty/fresh
        // The server returns a new actionToken that we'll use for subsequent actions
        const payload = {
          action: "start_run",
          actionToken: "", // Always start with empty token for new runs
          dungeonId: Number(dungeonId), // Ensure it's a number
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
        };

        // Final validation before API call
        const selectedDungeon = availableDungeons.find(d => d.id === dungeonId);
        if (!selectedDungeon) {
          throw new Error(`Selected dungeonId ${dungeonId} not found in available dungeons: ${availableDungeons.map(d => d.id).join(', ')}`);
        }

        if (selectedDungeon.energy > currentEnergy) {
          throw new Error(`Insufficient energy for ${selectedDungeon.name}. Required: ${selectedDungeon.energy}, Available: ${currentEnergy}`);
        }

        logger.info("Calling startRun API", {
          dungeonId: payload.dungeonId,
          dungeonName: selectedDungeon.name,
          energyCost: selectedDungeon.energy,
          currentEnergy,
          actionToken: payload.actionToken,
          actionTokenType: typeof payload.actionToken,
          fullPayload: payload,
          availableDungeonsCount: availableDungeons.length
        });

        let response = await ctx.options.client.startRun(payload);

        logger.debug("StartRun response", {
          success: response.success,
          hasActionToken: !!response.actionToken,
          messagePreview: response.message?.substring(0, 100)
        });

        // For startRun, we should NEVER retry with actionToken from error response
        // startRun must always use empty token for new runs
        // Only retry once with empty token if server has a temporary issue
        if (!response.success && response.message.includes("Invalid action token")) {
          logger.warn("🔄 StartRun failed with invalid token, retrying ONCE with empty token", {
            errorMessage: response.message,
            responseActionToken: response.actionToken,
            ourPayloadToken: payload.actionToken
          });

          // Retry exactly once with empty token
          response = await ctx.options.client.startRun({
            ...payload,
            actionToken: "", // Always empty for startRun
          });

          if (!response.success) {
            logger.error("❌ StartRun failed after retry, aborting", {
              firstError: response.message,
              dungeonId,
              actionToken: payload.actionToken
            });
          }
        }

        // If startRun still failed, give up
        if (!response.success) {
          logger.error("StartRun failed definitively", {
            lastError: response.message,
            actionToken: response.actionToken,
            dungeonId
          });
          
          // Create explicit error message for the user
          const errorMessage = `❌ DUNGEON START FAILED: ${response.message}

🔍 Possible causes:
• Server temporarily unavailable
• Insufficient energy (need ${payload.dungeonId} energy)
• Invalid dungeon selection

Please try again in a moment or choose a different dungeon.`;
          
          throw new Error(errorMessage);
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

        if (!state) {
          throw new Error("Failed to parse dungeon state after starting run");
        }

        ctx.memory.dungeon = state;
        ctx.memory.energy = await ctx.options.client.getEnergy(
          ctx.options.address
        );
        ctx.memory.lastUpdate = Date.now();

        logger.info("🎮 NEW RUN STARTED SUCCESSFULLY", {
          dungeonId,
          playerHealth: `${state.player?.health?.current}/${state.player?.health?.currentMax}`,
          enemyHealth: `${state.enemy?.health?.current}/${state.enemy?.health?.currentMax}`,
          room: `${state.currentRoom}/${state.currentDungeon}`,
          charges: getPlayerCharges(state.player),
          lootPhase: state.lootPhase
        });

        return {
          success: true,
          result: response.data,
          message: `🎯 Successfully started dungeon ${dungeonId}!

🗡️ Player: ${state.player?.health?.current}/${state.player?.health?.currentMax} HP
👹 Enemy: ${state.enemy?.health?.current}/${state.enemy?.health?.currentMax} HP  
🏠 Room: ${state.currentRoom}
⚔️ Ready for battle! Use rock/paper/scissor attacks.`,
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

        // Clean up action token after any startRun error
        ctx.options.actionToken = "";

        logger.info("🧹 StartRun error cleanup complete", {
          actionTokenCleared: ctx.options.actionToken === "",
          hasGigaverseState: !!gigaverseState,
          errorType: errorMessage.substring(0, 50)
        });

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
