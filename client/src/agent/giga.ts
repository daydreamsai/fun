import {
  context,
  render,
  action,
  type Agent,
  extension,
} from "@daydreamsai/core";

import { string, z } from "zod";

import { useSettingsStore } from "@/store/settingsStore";
import { GameClient } from "./client/GameClient";
// Import the template store
import { useTemplateStore } from "@/store/templateStore";

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
export interface GigaverseState {
  actionToken: string;
  energy: number;
  currentDungeon: string;
  currentRoom: string;
  currentEnemy: string;
  currentLoot: string;
  currentHP: number;
  playerHealth: number;
  playerMaxHealth: number;
  playerShield: number;
  playerMaxShield: number;
  rockAttack: number;
  rockDefense: number;
  rockCharges: number;
  paperAttack: number;
  paperDefense: number;
  paperCharges: number;
  scissorAttack: number;
  scissorDefense: number;
  scissorCharges: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  enemyShield: number;
  enemyMaxShield: number;
  lootPhase: string;
  lootOptions: any[];
  lastBattleResult: string;
  lastEnemyMove: string;
}

export const gigaverseVariables: string[] = [
  "actionToken",
  "energy",
  "currentDungeon",
  "currentRoom",
  "currentEnemy",
  "currentLoot",
  "currentHP",
  "playerHealth",
  "playerMaxHealth",
  "playerShield",
  "playerMaxShield",
  "rockAttack",
  "rockDefense",
  "rockCharges",
  "paperAttack",
  "paperDefense",
  "paperCharges",
  "scissorAttack",
  "scissorDefense",
  "scissorCharges",
  "enemyHealth",
  "enemyMaxHealth",
  "enemyShield",
  "enemyMaxShield",
  "lootPhase",
  "lootOptions",
  "lastBattleResult",
  "lastEnemyMove",
];

// Default template remains exported for initialization elsewhere if needed
export const template = `
You are Gigaverse Strategist, a Daydreams agent piloting a hero in “Gigaverse”, a roguelike dungeon crawler that uses an enhanced Rock-Paper-Scissors (RPS) combat system.

====================================================================
SYSTEM RULES — NEVER VIOLATE THESE
====================================================================
1. LEGAL MOVES ONLY • Each attack consumes 1 charge. If charges = 0, do not use that attack.
2. ENERGY GATING • If {{energy}} < 40 and you are NOT in combat ({{playerHealth}} & {{playerShield}} both = 0) ask the user to recover energy; if you are mid-battle, continue playing.
3. ERROR HANDLING • The server is authoritative. On an error, think, correct the issue, and retry. Abort the run only after 3 consecutive errors.
4. USER FIRST • Obey user instructions unless they conflict with rules 1-3.
5. OUTPUT • Provide plain-text only—no markdown or code fences.
6. LISTEN TO THE USER • Always listen to the user and follow their instructions, sometimes you might think you are stuck but you are not.
7. KEEP PLAYING • Keep playing even if you are low on energy, you can still play. You should keep playing until you have no energy left. If you die ({{playerHealth}} & {{playerShield}} both = 0), you should start a new run.
8. STARTING NEW RUN - If you die ({{playerHealth}} & {{playerShield}} both = 0), you should start a new run, otherwise never start a new run as it will result in an error.

====================================================================
DEBUGGING INSTRUCTIONS
====================================================================
- If you get an error you should follow these steps.
- Try to understand the error and what it means. These are the following errors you might get:
  - "Error handling action" - this means you have submitte the wrong action. Try selecting a loot or do an action that is valid.
  - "Unauthorized" - this means you are not authenticated. Tell the user to authenticate again.
- If you are in doubt, don't repeat what you just said or repeat the same action. You are most likely submitting the wrong action.

====================================================================
PRIMARY OBJECTIVE
====================================================================
Delve as deeply as possible:
• Defeat every foe.
• Select loot that maximises survival in the NEXT fight.
• Upon death, immediately begin a new run.
• If authentication fails, request the user to re-authenticate.

====================================================================
GAME CHEAT-SHEET
====================================================================
• RPS hierarchy: Rock > Scissors, Scissors > Paper, Paper > Rock.
• Damage = Winner ATK − Defender DEF (for that type); shields absorb first.
• Energy regenerates +1 every 2 turns.
• Loop: battle → loot → next room.
• If you are in the Loot phase {{lootPhase}} always select loot otherwise you will get an error.

Recommended move priority
1. Highest-damage attack with available charges.
2. Defensive play if lethal damage is possible within 2 turns.
3. Anticipate enemy pattern using {{lastEnemyMove}}.
4. Adapt when HP is low or shield broken.

====================================================================
CURRENT STATE (READ-ONLY)
<game_progress>
Dungeon: {{currentDungeon}} | Room: {{currentRoom}} | Loot Phase: {{lootPhase}}
Last Result: {{lastBattleResult}} | Enemy Last Move: {{lastEnemyMove}}
</game_progress>

<player_stats>
Energy {{energy}} | HP {{playerHealth}} / {{playerMaxHealth}} | Shield {{playerShield}} / {{playerMaxShield}}
ROCK  ATK {{rockAttack}} DEF {{rockDefense}} CHG {{rockCharges}}
PAPER ATK {{paperAttack}} DEF {{paperDefense}} CHG {{paperCharges}}
SCISS ATK {{scissorAttack}} DEF {{scissorDefense}} CHG {{scissorCharges}}
</player_stats>

<enemy_stats>
ID {{currentEnemy}} | HP {{enemyHealth}} / {{enemyMaxHealth}} | Shield {{enemyShield}} / {{enemyMaxShield}}
</enemy_stats>

====================================================================
THINKING INSTRUCTIONS
====================================================================
Privately create a <battle_planning> block (DO NOT reveal it in the final answer):
1. List every legal move and predict its outcome.
2. Weigh pros & cons.
3. Choose the optimal move and outline a two-turn plan.

====================================================================
OUTPUT FORMAT
====================================================================
Respond with EXACTLY three labelled lines—nothing more, nothing less:

Decision: <chosen move, e.g. “Attack-Rock” or “Take Loot #2”>
Explanation: <1-3 concise sentences of reasoning>
Next Steps: <brief plan for the next turns or loot phase>

Example  
Decision: Attack-Scissors  
Explanation: Scissors deals highest damage and counters enemy’s last Paper, breaking their shield.  
Next Steps: If enemy survives, finish with Rock; else enter loot phase and prioritise +Rock Charges.

====================================================================
BEGIN!


`;

export type GigaverseContext = typeof gigaverseContext;

// Context for the agent
export const gigaverseContext = context({
  type: "gigaverse",
  schema: {
    id: string(),
  },
  key: ({ id }) => id,
  maxSteps: 100,
  maxWorkingMemorySize: 20,

  setup() {
    const client = new GameClient(getApiBaseUrl(), getGigaToken());
    return { client };
  },

  create(_state): GigaverseState {
    return {
      actionToken: "0",
      energy: 0,
      currentDungeon: "0",
      currentRoom: "0",
      currentEnemy: "0",
      currentLoot: "0",
      currentHP: 0,
      playerHealth: 0,
      playerMaxHealth: 0,
      playerShield: 0,
      playerMaxShield: 0,
      rockAttack: 0,
      rockDefense: 0,
      rockCharges: 0,
      paperAttack: 0,
      paperDefense: 0,
      paperCharges: 0,
      scissorAttack: 0,
      scissorDefense: 0,
      scissorCharges: 0,
      enemyHealth: 0,
      enemyMaxHealth: 0,
      enemyShield: 0,
      enemyMaxShield: 0,
      lootPhase: "false",
      lootOptions: [],
      lastBattleResult: "",
      lastEnemyMove: "",
    };
  },

  async loader(state, _agent) {
    const { client } = state.options;

    const energy = await client.getEnergy(getAbstractAddress());

    state.memory.energy = energy;

    try {
      const response = await client.fetchDungeonState();

      if (!response.success) {
        throw new Error(`Fetch player state failed with status ${response}`);
      }

      // Update the state with player data
      if (
        response.data &&
        response.data.run &&
        response.data.run.players &&
        response.data.run.players.length > 0
      ) {
        const playerData = response.data.run.players[0]; // First player is the user

        // Update player stats
        state.memory.currentHP = playerData.health.current;
        state.memory.playerHealth = playerData.health.current;
        state.memory.playerMaxHealth = playerData.health.currentMax;
        state.memory.playerShield = playerData.shield.current;
        state.memory.playerMaxShield = playerData.shield.currentMax;

        // Update rock/paper/scissor stats
        state.memory.rockAttack = playerData.rock.currentATK;
        state.memory.rockDefense = playerData.rock.currentDEF;
        state.memory.rockCharges = playerData.rock.currentCharges;

        state.memory.paperAttack = playerData.paper.currentATK;
        state.memory.paperDefense = playerData.paper.currentDEF;
        state.memory.paperCharges = playerData.paper.currentCharges;

        state.memory.scissorAttack = playerData.scissor.currentATK;
        state.memory.scissorDefense = playerData.scissor.currentDEF;
        state.memory.scissorCharges = playerData.scissor.currentCharges;

        // Update loot phase status
        state.memory.lootPhase = (
          response.data.run.lootPhase || false
        ).toString();

        // Update loot options if available
        if (
          response.data.run.lootOptions &&
          response.data.run.lootOptions.length > 0
        ) {
          state.memory.lootOptions = response.data.run.lootOptions;
          state.memory.currentLoot =
            response.data.run.lootOptions.length.toString();
        }

        // Update room information if available
        if (response.data.entity) {
          state.memory.currentRoom =
            response.data.entity.ROOM_NUM_CID.toString();
          state.memory.currentDungeon =
            response.data.entity.DUNGEON_ID_CID.toString();
          state.memory.currentEnemy = response.data.entity.ENEMY_CID.toString();
        }

        // Update enemy stats if available
        if (response.data.run.players.length > 1) {
          const enemyData = response.data.run.players[1]; // Second player is the enemy
          state.memory.enemyHealth = enemyData.health.current;
          state.memory.enemyMaxHealth = enemyData.health.currentMax;
          state.memory.enemyShield = enemyData.shield.current;
          state.memory.enemyMaxShield = enemyData.shield.currentMax;

          // Update battle result and enemy move if available
          if (enemyData.lastMove) {
            state.memory.lastEnemyMove = enemyData.lastMove;

            // Determine battle result based on thisPlayerWin and otherPlayerWin properties
            if (playerData.thisPlayerWin === true) {
              state.memory.lastBattleResult = "win";
            } else if (enemyData.thisPlayerWin === true) {
              state.memory.lastBattleResult = "lose";
            } else {
              state.memory.lastBattleResult = "draw";
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error fetching player state:", errorMessage);
    }
  },

  render({ memory }) {
    // Get the current template from the Zustand store
    const currentTemplate = useTemplateStore.getState().template;
    // Use the template from the store
    return render(currentTemplate, memory);
  },
}).setActions([
  /**
   * Action to attack in the rock-paper-scissors game
   */
  action({
    name: "gigaverse.attackInDungeon",
    description:
      "Attack in the dungeon. Use this when you are in the dungeon and you want to attack an enemy.",
    schema: z
      .object({
        action: z
          .enum([
            "rock",
            "paper",
            "scissor",
            "loot_one",
            "loot_two",
            "loot_three",
          ])
          .describe("The attack move to make"),
        dungeonId: z
          .number()
          .default(0)
          .describe("The ID of the dungeon. It is always 0."),
      })
      .describe(
        "You use this to make an action in a dungeon. If the lootPhase == true then you can select the Loot option, which will then take you to the next phase. If the lootPhase == false then you can select the Rock, Paper, Scissors option."
      ),

    async handler(args, { memory, options }, _agent) {
      const { client } = options;

      try {
        const { action, dungeonId } = args;

        const actionToken = memory.actionToken ?? "";
        const currentTime = Date.now();
        const threeMinutesInMs = 3 * 60 * 1000;

        const payload = {
          action: action,
          actionToken:
            currentTime - parseInt(actionToken) > threeMinutesInMs
              ? ""
              : actionToken,
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
          dungeonId: dungeonId,
        };

        const response = await client.playMove(payload);

        if (!response.success) {
          throw new Error(
            `Attack action failed with status ${response.success}`
          );
        }

        // Add a 4 second delay to allow for animation and user experience
        await new Promise((resolve) => setTimeout(resolve, 4000));

        // If this was a combat action, visualize the RPS result
        let enemyMove = "unknown";
        let battleResult = "draw";

        // Extract data from the response structure
        if (
          response.data &&
          response.data.run &&
          response.data.run.players &&
          response.data.run.players.length >= 2
        ) {
          const playerData = response.data.run.players[0]; // First player is the user
          const enemyData = response.data.run.players[1]; // Second player is the enemy

          // Get the enemy's last move
          enemyMove = enemyData.lastMove || "unknown";

          // Determine the battle result
          if (playerData.thisPlayerWin === true) {
            battleResult = "win";
          } else {
            battleResult = "lose";
          }

          // Update player stats
          memory.currentHP = playerData.health.current;
          memory.playerHealth = playerData.health.current;
          memory.playerMaxHealth = playerData.health.currentMax;
          memory.playerShield = playerData.shield.current;
          memory.playerMaxShield = playerData.shield.currentMax;

          // Update rock/paper/scissor stats
          memory.rockAttack = playerData.rock.currentATK;
          memory.rockDefense = playerData.rock.currentDEF;
          memory.rockCharges = playerData.rock.currentCharges;

          memory.paperAttack = playerData.paper.currentATK;
          memory.paperDefense = playerData.paper.currentDEF;
          memory.paperCharges = playerData.paper.currentCharges;

          memory.scissorAttack = playerData.scissor.currentATK;
          memory.scissorDefense = playerData.scissor.currentDEF;
          memory.scissorCharges = playerData.scissor.currentCharges;

          // Update enemy stats
          memory.enemyHealth = enemyData.health.current;
          memory.enemyMaxHealth = enemyData.health.currentMax;
          memory.enemyShield = enemyData.shield.current;
          memory.enemyMaxShield = enemyData.shield.currentMax;

          // Update battle result and enemy move
          memory.lastBattleResult = battleResult;
          memory.lastEnemyMove = enemyMove;

          // Update loot phase status
          memory.lootPhase = (response.data.run.lootPhase || false).toString();

          // Update loot options if available
          if (
            response.data.run.lootOptions &&
            response.data.run.lootOptions.length > 0
          ) {
            memory.lootOptions = response.data.run.lootOptions;
            memory.currentLoot =
              response.data.run.lootOptions.length.toString();
          }

          // Update room information
          if (response.data.entity) {
            memory.currentRoom = response.data.entity.ROOM_NUM_CID.toString();
            memory.currentDungeon =
              response.data.entity.DUNGEON_ID_CID.toString();
            memory.currentEnemy = response.data.entity.ENEMY_CID.toString();
          }
        }

        memory.actionToken = response.actionToken?.toString() ?? "";

        return {
          success: true,
          result: response.data,
          message: `
         Successfully performed ${action} attack in dungeon ${dungeonId}

         Enemy Move: ${enemyMove}
         Battle Result: ${battleResult}

         Player Health: ${memory.playerHealth}
         Player Max Health: ${memory.playerMaxHealth}
         Player Shield: ${memory.playerShield}
         Player Max Shield: ${memory.playerMaxShield}`,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error performing attack action:", error);

        memory.actionToken = "";

        return {
          success: false,
          error: errorMessage,
          message: "Failed to perform attack action",
        };
      }
    },
  }),
  action({
    name: "getUpcomingEnemies",
    description: "Fetch information about all upcoming enemies in the dungeon",
    schema: z.object({}), // No parameters needed for this GET request
    async handler(_data, _ctx: any, _agent: Agent) {
      const gameClient = new GameClient(getApiBaseUrl(), getGigaToken());

      try {
        const response = await gameClient.getAllEnemies();

        if (!response.entities) {
          throw new Error(
            `Fetch enemies failed with status ${response.entities}`
          );
        }

        return {
          success: true,
          enemies: response.entities,
          message: "Successfully fetched upcoming enemies data",
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error fetching enemies data:", error);

        return {
          success: false,
          error: errorMessage,
          message: "Failed to fetch upcoming enemies data",
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
    schema: z.object({
      dungeonId: z
        .number()
        .default(1)
        .describe("The ID of the dungeon to start. It should always be 1"),
    }),
    async handler(data, ctx) {
      try {
        const { dungeonId } = data;

        const payload = {
          action: "start_run",
          actionToken: ctx.memory.actionToken,
          dungeonId: 1, // hardcode for now
          data: {
            consumables: [],
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

        if (
          response.data &&
          response.data.run &&
          response.data.run.players &&
          response.data.run.players.length > 0
        ) {
          const state = ctx.memory;
          const playerData = response.data.run.players[0]; // First player is the user

          // Update player stats
          state.currentHP = playerData.health.current;
          state.playerHealth = playerData.health.current;
          state.playerMaxHealth = playerData.health.currentMax;
          state.playerShield = playerData.shield.current;
          state.playerMaxShield = playerData.shield.currentMax;

          // Update rock/paper/scissor stats
          state.rockAttack = playerData.rock.currentATK;
          state.rockDefense = playerData.rock.currentDEF;
          state.rockCharges = playerData.rock.currentCharges;

          state.paperAttack = playerData.paper.currentATK;
          state.paperDefense = playerData.paper.currentDEF;
          state.paperCharges = playerData.paper.currentCharges;

          state.scissorAttack = playerData.scissor.currentATK;
          state.scissorDefense = playerData.scissor.currentDEF;
          state.scissorCharges = playerData.scissor.currentCharges;

          // Update dungeon info
          state.currentDungeon = dungeonId.toString();
          state.currentRoom = "1"; // New runs start at room 1
          state.lootPhase = "false";
          state.lootOptions = [];
          state.lastBattleResult = "";
          state.lastEnemyMove = "";

          // Update enemy stats (reset them for new run)
          state.enemyHealth = 0;
          state.enemyMaxHealth = 0;
          state.enemyShield = 0;
          state.enemyMaxShield = 0;
          state.currentEnemy = "0";
        }

        ctx.memory.actionToken = response.actionToken?.toString() ?? "";

        return {
          success: true,
          result: response.data,
          message: `Successfully started a new run in dungeon ${dungeonId}`,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error starting new run:", error);

        ctx.memory.actionToken = "";

        return {
          success: false,
          error: errorMessage,
          message: "Failed to start a new dungeon run",
        };
      }
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
