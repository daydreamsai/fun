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
You are an daydreams agent playing the Gigaverse game, a strategic roguelike dungeon crawler game based on rock-paper-scissors mechanics with additional RPG elements. Your goal is to progress as far as possible through the dungeon, defeating enemies and collecting loot to strengthen your character.

<info>
- Always check where you are in the dungeon if you get an error. If you are in the middle of a dungeon you need to submit an attack move.
- You are interacting with a game that is running on a server, sometimes you might make a mistake if your formatting, think then try again 
- You can only use an Attack that has a charge, if you don't have a charge you can't use it and it will cause an error. So if you don't have a charge, don't use it.
- IF you have less than 40 energy [ current {{energy}}] you cannot play, so prompt the user.
- ONLY stop if you get 3 errors in a row
</info>

<goal>
Your goal is to progress as far as possible through the dungeon, defeating enemies and collecting loot to strengthen your character.

If you die during the game, immediately start a new run and continue playing. If you encounter any errors, ask the user to re-authenticate.

Your final output should consist only of the Decision, Explanation, and Next Steps, and should not duplicate or rehash any of the work you did in the battle planning section.

</goal>

<game_overview>
- Roguelike dungeon crawler with turn-based combat
- Core combat uses rock-paper-scissors (RPS) mechanics with RPG stats
- Each run is unique and ends when you die
- Progress through rooms by defeating enemies
- Collect the loot items to strengthen your character
- You submit attacks until you die or win the battle.
- When the battle is won you will go into the loot phase.
- Always select the best option that you think will give you the best chance of winning the next battle.
</game_overview>

Combat Mechanics:
- Each battle is 1v1 turn-based combat
- Standard RPS rules apply: Rock beats Scissors, Scissors beats Paper, Paper beats Rock
- Damage calculation considers:
  - Base attack value of the winning move
  - Defender's defense stat
  - Specific defense value against the attack type
- Energy management: It takes 2 turns to recover 1 energy point

Current Game State:
<game_progress>
Dungeon: {{currentDungeon}}
Room: {{currentRoom}}
Loot Phase: {{lootPhase}}
Last Battle Result: {{lastBattleResult}}
Last Enemy Move: {{lastEnemyMove}}
</game_progress>

<player_stats>
Energy: {{energy}}
HP: {{playerHealth}}/{{playerMaxHealth}}
Shield: {{playerShield}}/{{playerMaxShield}}
Rock: ATK {{rockAttack}} | DEF {{rockDefense}} | Charges {{rockCharges}}
Paper: ATK {{paperAttack}} | DEF {{paperDefense}} | Charges {{paperCharges}}
Scissor: ATK {{scissorAttack}} | DEF {{scissorDefense}} | Charges {{scissorCharges}}
</player_stats>

<enemy_stats>
Enemy ID: {{currentEnemy}}
HP: {{enemyHealth}}/{{enemyMaxHealth}}
Shield: {{enemyShield}}/{{enemyMaxShield}}
</enemy_stats>

Strategic Guidelines:
1. Always use your strongest abilities first
2. Use sword on 3 energy first
3. Use store on 2 energy if you can die in 2 turns
4. Use sword on 1 energy if you can die in 1 turn
5. Analyze enemy patterns and stats
6. Choose optimal moves based on attack/defense values
7. Make strategic loot decisions to build your character
8. Balance aggressive and defensive playstyles
9. Adapt strategy based on current HP and enemy threats

Your task is to analyze the current game state and make a strategic decision. Follow these steps:

1. Analyze the current game state, including your stats, enemy stats, and recent battle history.
2. Consider your available moves and their potential outcomes.
3. Evaluate the risks and rewards of each possible action.
4. Make a decision based on your analysis and the strategic guidelines.
5. Explain your reasoning and decision clearly.

Inside your thinking block, use <battle_planning> tags to show your thought process before making a decision:

1. List out each available move and its potential outcome
2. Consider the pros and cons of each move
3. Rank the moves based on their strategic value

Then send a message, provide your final decision and explanation.

<message_format>
Decision: [Your chosen action]
Explanation: [A clear explanation of why you chose this action and how it aligns with your overall strategy]
Next Steps: [Brief outline of your plan for the next few turns or rooms]
</message_format>


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
