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

// Define an interface for the state
interface GigaverseState {
  actionToken: string;
  energy: number;
  currentTask: string | null;
  currentDungeon: string;
  currentRoom: string;
  currentEnemy: string;
  currentLoot: string;
  currentHP: string;
  playerHealth: string;
  playerMaxHealth: string;
  playerShield: string;
  playerMaxShield: string;
  rockAttack: string;
  rockDefense: string;
  rockCharges: string;
  paperAttack: string;
  paperDefense: string;
  paperCharges: string;
  scissorAttack: string;
  scissorDefense: string;
  scissorCharges: string;
  enemyHealth: string;
  enemyMaxHealth: string;
  enemyShield: string;
  enemyMaxShield: string;
  lootPhase: string;
  lootOptions: any[];
  lastBattleResult: string;
  lastEnemyMove: string;
}

// Helper function to initialize agent memory if it doesn't exist
export function initializeAgentMemory(memory: any): GigaverseState {
  if (!memory) {
    memory = {
      actionToken: "",
      energy: 0,
      currentTask: "Make strategic decisions",
      currentDungeon: "0",
      currentRoom: "0",
      currentEnemy: "0",
      currentLoot: "0",
      currentHP: "0",
      playerHealth: "0",
      playerMaxHealth: "0",
      playerShield: "0",
      playerMaxShield: "0",
      rockAttack: "0",
      rockDefense: "0",
      rockCharges: "0",
      paperAttack: "0",
      paperDefense: "0",
      paperCharges: "0",
      scissorAttack: "0",
      scissorDefense: "0",
      scissorCharges: "0",
      enemyHealth: "0",
      enemyMaxHealth: "0",
      enemyShield: "0",
      enemyMaxShield: "0",
      lootPhase: "false",
      lootOptions: [],
      lastBattleResult: "",
      lastEnemyMove: "",
    };
  }
  return memory as GigaverseState;
}

// Template for the agent's context
export const template = `
You are an daydreams agent playing the Gigaverse game, a strategic roguelike dungeon crawler game based on rock-paper-scissors mechanics with additional RPG elements. Your goal is to progress as far as possible through the dungeon, defeating enemies and collecting loot to strengthen your character.

<info>
- You are interacting with a game that is running on a server, sometimes you might make a mistake if your formatting, think then try again 
- You can only use an Attack that has a charge, if you don't have a charge you can't use it and it will cause an error. So if you don't have a charge, don't use it.
- Don't stop after killing an enemy, you need to keep playing until you cannot anymore.
- Don't stop after the loot phase, you need to keep playing until you cannot anymore.
- Don't stop after the dungeon is completed, you need to keep playing until you cannot anymore.
- Don't stop after the game is over, start a new run

- IF you have less than 40 energy [ current {{energy}}] you cannot play, so prompt the user.
- ONLY stop if you get 3 errors in a row
</info>

<goal>
Your goal is to progress as far as possible through the dungeon, defeating enemies and collecting loot to strengthen your character. Don't stop playing until you cannot anymore.

IMPORTANT: Always keep playing until you cannot anymore.
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

<goals_and_tasks>
Goal: {{goal}}
Tasks: {{tasks}}
Current Task: {{currentTask}}
</goals_and_tasks>

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

Then, outside of the thinking block, provide your final decision and explanation.

If you die during the game, immediately start a new run and continue playing. If you encounter any errors, ask the user to re-authenticate.

Output Format:
Decision: [Your chosen action]
Explanation: [A clear explanation of why you chose this action and how it aligns with your overall strategy]

Next Steps: [Brief outline of your plan for the next few turns or rooms]

Remember to constantly monitor the game state, adapt your strategy as needed, and always strive to make the best possible decisions for long-term success in the dungeon. Your final output should consist only of the Decision, Explanation, and Next Steps, and should not duplicate or rehash any of the work you did in the battle planning section.

`;

// Context for the agent
export const goalContexts = context({
  type: "goal",
  maxSteps: 100,
  schema: z.object({
    id: string(),
  }),
  maxWorkingMemorySize: 20,
  key() {
    return "1";
  },
  async loader(state, agent) {
    console.log("loader", state, agent);

    const gameClient = new GameClient(getApiBaseUrl(), getGigaToken());

    const energy = await gameClient.getEnergy(getAbstractAddress());

    state.memory.energy = energy;

    try {
      const response = await gameClient.fetchDungeonState();

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
        state.memory.currentHP = playerData.health.current.toString();
        state.memory.playerHealth = playerData.health.current.toString();
        state.memory.playerMaxHealth = playerData.health.currentMax.toString();
        state.memory.playerShield = playerData.shield.current.toString();
        state.memory.playerMaxShield = playerData.shield.currentMax.toString();

        // Update rock/paper/scissor stats
        state.memory.rockAttack = playerData.rock.currentATK.toString();
        state.memory.rockDefense = playerData.rock.currentDEF.toString();
        state.memory.rockCharges = playerData.rock.currentCharges.toString();

        state.memory.paperAttack = playerData.paper.currentATK.toString();
        state.memory.paperDefense = playerData.paper.currentDEF.toString();
        state.memory.paperCharges = playerData.paper.currentCharges.toString();

        state.memory.scissorAttack = playerData.scissor.currentATK.toString();
        state.memory.scissorDefense = playerData.scissor.currentDEF.toString();
        state.memory.scissorCharges =
          playerData.scissor.currentCharges.toString();

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
          state.memory.enemyHealth = enemyData.health.current.toString();
          state.memory.enemyMaxHealth = enemyData.health.currentMax.toString();
          state.memory.enemyShield = enemyData.shield.current.toString();
          state.memory.enemyMaxShield = enemyData.shield.currentMax.toString();

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

  create(_state): GigaverseState {
    return {
      actionToken: "0",
      currentTask: "Progress through the dungeon",
      energy: 0,
      currentDungeon: "0",
      currentRoom: "0",
      currentEnemy: "0",
      currentLoot: "0",
      currentHP: "0",
      playerHealth: "0",
      playerMaxHealth: "0",
      playerShield: "0",
      playerMaxShield: "0",
      rockAttack: "0",
      rockDefense: "0",
      rockCharges: "0",
      paperAttack: "0",
      paperDefense: "0",
      paperCharges: "0",
      scissorAttack: "0",
      scissorDefense: "0",
      scissorCharges: "0",
      enemyHealth: "0",
      enemyMaxHealth: "0",
      enemyShield: "0",
      enemyMaxShield: "0",
      lootPhase: "false",
      lootOptions: [],
      lastBattleResult: "",
      lastEnemyMove: "",
    };
  },

  render({ memory }) {
    return render(template, {
      goal: memory.goal,
      tasks: memory.tasks.join("\n"),
      currentTask: memory.currentTask ?? "NONE",
      currentDungeon: memory.currentDungeon ?? "0",
      currentRoom: memory.currentRoom ?? "0",
      currentEnemy: memory.currentEnemy ?? "0",
      currentLoot: memory.currentLoot ?? "0",
      currentHP: memory.currentHP ?? "0",
      playerHealth: memory.playerHealth ?? "0",
      playerMaxHealth: memory.playerMaxHealth ?? "0",
      playerShield: memory.playerShield ?? "0",
      playerMaxShield: memory.playerMaxShield ?? "0",
      rockAttack: memory.rockAttack ?? "0",
      rockDefense: memory.rockDefense ?? "0",
      rockCharges: memory.rockCharges ?? "0",
      paperAttack: memory.paperAttack ?? "0",
      paperDefense: memory.paperDefense ?? "0",
      paperCharges: memory.paperCharges ?? "0",
      scissorAttack: memory.scissorAttack ?? "0",
      scissorDefense: memory.scissorDefense ?? "0",
      scissorCharges: memory.scissorCharges ?? "0",
      enemyHealth: memory.enemyHealth ?? "0",
      enemyMaxHealth: memory.enemyMaxHealth ?? "0",
      enemyShield: memory.enemyShield ?? "0",
      enemyMaxShield: memory.enemyMaxShield ?? "0",
      lootPhase: memory.lootPhase ?? "false",
      lootOptions: memory.lootOptions ?? [],
      lastBattleResult: memory.lastBattleResult ?? "",
      lastEnemyMove: memory.lastEnemyMove ?? "",
    } as any);
  },
}).setActions([
  /**
   * Action to attack in the rock-paper-scissors game
   */
  action({
    name: "attackInDungeon",
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
    async handler(args, { memory }, _agent) {
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

        const gameClient = new GameClient(getApiBaseUrl(), getGigaToken());
        const response = await gameClient.playMove(payload);

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
          memory.currentHP = playerData.health.current.toString();
          memory.playerHealth = playerData.health.current.toString();
          memory.playerMaxHealth = playerData.health.currentMax.toString();
          memory.playerShield = playerData.shield.current.toString();
          memory.playerMaxShield = playerData.shield.currentMax.toString();

          // Update rock/paper/scissor stats
          memory.rockAttack = playerData.rock.currentATK.toString();
          memory.rockDefense = playerData.rock.currentDEF.toString();
          memory.rockCharges = playerData.rock.currentCharges.toString();

          memory.paperAttack = playerData.paper.currentATK.toString();
          memory.paperDefense = playerData.paper.currentDEF.toString();
          memory.paperCharges = playerData.paper.currentCharges.toString();

          memory.scissorAttack = playerData.scissor.currentATK.toString();
          memory.scissorDefense = playerData.scissor.currentDEF.toString();
          memory.scissorCharges = playerData.scissor.currentCharges.toString();

          // Update enemy stats
          memory.enemyHealth = enemyData.health.current.toString();
          memory.enemyMaxHealth = enemyData.health.currentMax.toString();
          memory.enemyShield = enemyData.shield.current.toString();
          memory.enemyMaxShield = enemyData.shield.currentMax.toString();

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

        memory.actionToken = response.actionToken;

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
         Player Max Shield: ${memory.playerMaxShield}
         
         

         `,
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
   * Action to fetch the player's current state in the dungeon
   */
  // action({
  //   name: "getPlayerState",
  //   description:
  //     "Fetch the current state of the player in the dungeon, you should do this when you start a new run or when you die",
  //   schema: z.object({}),
  //   async handler(_data, { memory }, _agent: Agent) {
  //     const gameClient = new GameClient(getApiBaseUrl(), getGigaToken());
  //     try {
  //       const response = await gameClient.fetchDungeonState();

  //       if (!response.data) {
  //         throw new Error(
  //           `Fetch player state failed with status ${response.success}`
  //         );
  //       }

  //       // Update the state with player data
  //       if (
  //         response.data &&
  //         response.data.run &&
  //         response.data.run.players &&
  //         response.data.run.players.length > 0
  //       ) {
  //         const playerData = response.data.run.players[0]; // First player is the user

  //         // Update player stats
  //         memory.currentHP = playerData.health.current.toString();
  //         memory.playerHealth = playerData.health.current.toString();
  //         memory.playerMaxHealth = playerData.health.currentMax.toString();
  //         memory.playerShield = playerData.shield.current.toString();
  //         memory.playerMaxShield = playerData.shield.currentMax.toString();

  //         // Update rock/paper/scissor stats
  //         memory.rockAttack = playerData.rock.currentATK.toString();
  //         memory.rockDefense = playerData.rock.currentDEF.toString();
  //         memory.rockCharges = playerData.rock.currentCharges.toString();

  //         memory.paperAttack = playerData.paper.currentATK.toString();
  //         memory.paperDefense = playerData.paper.currentDEF.toString();
  //         memory.paperCharges = playerData.paper.currentCharges.toString();

  //         memory.scissorAttack = playerData.scissor.currentATK.toString();
  //         memory.scissorDefense = playerData.scissor.currentDEF.toString();
  //         memory.scissorCharges = playerData.scissor.currentCharges.toString();

  //         // Update loot phase status
  //         memory.lootPhase = (response.data.run.lootPhase || false).toString();

  //         // Update loot options if available
  //         if (
  //           response.data.run.lootOptions &&
  //           response.data.run.lootOptions.length > 0
  //         ) {
  //           memory.lootOptions = response.data.run.lootOptions;
  //           memory.currentLoot =
  //             response.data.run.lootOptions.length.toString();
  //         }

  //         // Update room information if available
  //         if (response.data.entity) {
  //           memory.currentRoom = response.data.entity.ROOM_NUM_CID.toString();
  //           memory.currentDungeon =
  //             response.data.entity.DUNGEON_ID_CID.toString();
  //           memory.currentEnemy = response.data.entity.ENEMY_CID.toString();
  //         }

  //         // Update enemy stats if available
  //         if (response.data.run.players.length > 1) {
  //           const enemyData = response.data.run.players[1]; // Second player is the enemy
  //           memory.enemyHealth = enemyData.health.current.toString();
  //           memory.enemyMaxHealth = enemyData.health.currentMax.toString();
  //           memory.enemyShield = enemyData.shield.current.toString();
  //           memory.enemyMaxShield = enemyData.shield.currentMax.toString();

  //           // Update battle result and enemy move if available
  //           if (enemyData.lastMove) {
  //             memory.lastEnemyMove = enemyData.lastMove;

  //             // Determine battle result based on thisPlayerWin and otherPlayerWin properties
  //             if (playerData.thisPlayerWin === true) {
  //               memory.lastBattleResult = "win";
  //             } else if (enemyData.thisPlayerWin === true) {
  //               memory.lastBattleResult = "lose";
  //             } else {
  //               memory.lastBattleResult = "draw";
  //             }
  //           }
  //         }
  //       }

  //       return {
  //         success: true,
  //         playerState: response.data,
  //         message: "Successfully fetched player's dungeon state",
  //       };
  //     } catch (error: unknown) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : String(error);
  //       console.error("Error fetching player state:", error);

  //       return {
  //         success: false,
  //         error: errorMessage,
  //         message: "Failed to fetch player's dungeon state",
  //       };
  //     }
  //   },
  // }),

  /**
   * Action to start a new dungeon run
   */
  action({
    name: "startNewRun",
    description:
      "Start a new dungeon run. Use this when the player dies or wants to start a new run from outside the dungeon.",
    schema: z.object({
      dungeonId: z
        .number()
        .default(1)
        .describe("The ID of the dungeon to start. It should always be 1"),
    }),
    async handler(data, ctx: any, _agent: Agent) {
      try {
        const { dungeonId } = data;

        const payload = {
          action: "start_run",
          actionToken: ctx.memory.actionToken ?? "",
          dungeonId: 1, // hardcode for now
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
        };

        const gameClient = new GameClient(getApiBaseUrl(), getGigaToken());

        const response = await gameClient.startRun(payload);

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
          const state = initializeAgentMemory(ctx);
          const playerData = response.data.run.players[0]; // First player is the user

          // Update player stats
          state.currentHP = playerData.health.current.toString();
          state.playerHealth = playerData.health.current.toString();
          state.playerMaxHealth = playerData.health.currentMax.toString();
          state.playerShield = playerData.shield.current.toString();
          state.playerMaxShield = playerData.shield.currentMax.toString();

          // Update rock/paper/scissor stats
          state.rockAttack = playerData.rock.currentATK.toString();
          state.rockDefense = playerData.rock.currentDEF.toString();
          state.rockCharges = playerData.rock.currentCharges.toString();

          state.paperAttack = playerData.paper.currentATK.toString();
          state.paperDefense = playerData.paper.currentDEF.toString();
          state.paperCharges = playerData.paper.currentCharges.toString();

          state.scissorAttack = playerData.scissor.currentATK.toString();
          state.scissorDefense = playerData.scissor.currentDEF.toString();
          state.scissorCharges = playerData.scissor.currentCharges.toString();

          // Update dungeon info
          state.currentDungeon = dungeonId.toString();
          state.currentRoom = "1"; // New runs start at room 1
          state.lootPhase = "false";
          state.lootOptions = [];
          state.lastBattleResult = "";
          state.lastEnemyMove = "";

          // Update enemy stats (reset them for new run)
          state.enemyHealth = "0";
          state.enemyMaxHealth = "0";
          state.enemyShield = "0";
          state.enemyMaxShield = "0";
          state.currentEnemy = "0";
        }

        ctx.memory.actionToken = response.actionToken;

        return {
          success: true,
          result: response.data,
          message: `Successfully started a new run in dungeon ${dungeonId}`,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error starting new run:", error);

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
    goal: goalContexts,
  },
});
