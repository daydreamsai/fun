/**
 * Example Gigaverse Integration
 *
 * This file demonstrates integration with the Gigaverse game ecosystem.
 * It sets up an agent that can interact with the Gigaverse API to:
 * - Navigate dungeons
 * - Make combat decisions
 * - Select loot and rewards
 * - Manage inventory and character progression
 *
 * The agent uses a goal-oriented approach to plan and execute actions
 * within the game world, making strategic decisions based on the current
 * game state and available options.
 *
 * Authentication is handled via the GIGA_TOKEN environment variable,
 * which must be properly configured for API access. This is the Bearer token. You can copy this from your browser environment.
 *
 * DEBUGGING
 * 1. Your GIGA token expires every 24hrs. Unsure exactly when. If you get an error about the token, just re-authenticate.
 * 2. You can run out of Energy per day - so this will obviously affect your ability to play and throw errors.
 */

import {
  context,
  render,
  action,
  type ActionCall,
  type Agent,
  extension,
} from "@daydreamsai/core";

import { string, z } from "zod";

import { getUserSettings } from "@/utils/settings";

export const GIGA_TOKEN = getUserSettings()?.gigaverseToken;

// Add a helper function to get the API base URL
export const getApiBaseUrl = () => {
  // In development, use the Vite proxy
  if (import.meta.env.DEV) {
    return "/gigaverse-api";
  }
  // In production, use the direct URL
  return "https://gigaverse.io/api";
};

// Define an interface for the state
interface GigaverseState {
  goal: string;
  tasks: string[];
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
export function initializeAgentMemory(ctx: any): GigaverseState {
  if (!ctx.agentMemory) {
    ctx.agentMemory = {
      goal: "Progress in the dungeon",
      tasks: ["Make strategic decisions"],
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
  return ctx.agentMemory as GigaverseState;
}

// Template for the agent's context
export const template = `
You are an expert AI agent playing a strategic roguelike dungeon crawler game based on rock-paper-scissors mechanics with additional RPG elements called Gigaverse. 

<goal>
- Keep the User updated on the progress and your thinking around what you are doing.
- You must always make a new run if you die.
- You must never stop playing. If you die, you must start a new run.
- You must always make a strategic decision based on the current state of the game.
</goal>

## Game Overview:
- Roguelike dungeon crawler with turn-based combat
- Core combat uses rock-paper-scissors (RPS) mechanics with RPG stats
- Each run is unique and ends when you die
- Progress through rooms by defeating enemies
- Collect loot to strengthen your character

## Combat Mechanics:
- Each battle is 1v1 turn-based combat
- You and enemies have stats:
  - HP (Health Points)
  - Defense (Reduces damage taken)
  - Attack values for Rock/Paper/Scissors moves
  - Defense values for Rock/Paper/Scissors moves
- Standard RPS rules apply:
  - Rock beats Scissors
  - Scissors beats Paper
  - Paper beats Rock
- Damage calculation considers:
  - Base attack value of the winning move
  - Defender's defense stat
  - Specific defense value against the attack type

## Progression System:
- Start in Room 1 and progress by defeating enemies
- After each victory, you can choose from multiple loot options
- Loot can improve your stats or provide special abilities
- Higher rooms contain stronger enemies but better rewards
- Goal is to progress as far as possible before dying

## Strategic Elements:
- Analyze enemy patterns and stats
- Choose optimal moves based on attack/defense values
- Make strategic loot decisions to build your character
- Balance aggressive and defensive playstyles
- Adapt strategy based on current HP and enemy threats

Remember to:
- Monitor your HP and enemy stats
- Consider both immediate battles and long-term survival
- Make informed decisions about loot selection
- Learn from enemy patterns to predict their moves

## Current Status:
Goal: {{goal}} 
Tasks: {{tasks}}
Current Task: {{currentTask}}

## Game State:
Dungeon: {{currentDungeon}}
Room: {{currentRoom}}
Loot Phase: {{lootPhase}}
Last Battle Result: {{lastBattleResult}}
Last Enemy Move: {{lastEnemyMove}}

## Player Stats:
HP: {{playerHealth}}/{{playerMaxHealth}}
Shield: {{playerShield}}/{{playerMaxShield}}
Rock: ATK {{rockAttack}} | DEF {{rockDefense}} | Charges {{rockCharges}}
Paper: ATK {{paperAttack}} | DEF {{paperDefense}} | Charges {{paperCharges}}
Scissor: ATK {{scissorAttack}} | DEF {{scissorDefense}} | Charges {{scissorCharges}}

## Enemy Stats:
Enemy ID: {{currentEnemy}}
HP: {{enemyHealth}}/{{enemyMaxHealth}}
Shield: {{enemyShield}}/{{enemyMaxShield}}

`;

// Context for the agent
export const goalContexts = context({
  type: "goal",
  schema: z.object({
    id: string(),
    initialGoal: z.string().default("Progress in the dungeon"),
    initialTasks: z.array(z.string()).default(["Make strategic decisions"]),
  }),

  key() {
    return "1";
  },

  create(_state): GigaverseState {
    return {
      goal: "Progress in the dungeon",
      tasks: ["Make strategic decisions"],
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
});

// Create the Gigaverse agent with UI integration
export const giga = extension({
  name: "giga",
  contexts: {
    goal: goalContexts,
  },
  actions: [
    /**
     * Action to attack in the rock-paper-scissors game
     */
    action({
      name: "attackInDungeon",
      description:
        "Attack in the dungeon using rock-paper-scissors game mechanics",
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
      async handler(
        call: ActionCall<{
          action:
            | "rock"
            | "paper"
            | "scissor"
            | "loot_one"
            | "loot_two"
            | "loot_three";
          dungeonId: number;
        }>,
        ctx: any,
        _agent: Agent
      ) {
        try {
          const { action, dungeonId } = call.data;

          const payload = {
            action: action,
            actionToken: new Date().getTime().toString(),
            dungeonId: dungeonId,
          };

          const response = await fetch(
            `${getApiBaseUrl()}/game/dungeon/action`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GIGA_TOKEN}`,
              },
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            throw new Error(
              `Attack action failed with status ${response.status}`
            );
          }

          const result = await response.json();

          // If this was a combat action, visualize the RPS result
          let enemyMove = "unknown";
          let battleResult = "draw";

          // Update the state with player and enemy data
          const state = initializeAgentMemory(ctx);

          // Extract data from the response structure
          if (
            result.data &&
            result.data.run &&
            result.data.run.players &&
            result.data.run.players.length >= 2
          ) {
            const playerData = result.data.run.players[0]; // First player is the user
            const enemyData = result.data.run.players[1]; // Second player is the enemy

            // Get the enemy's last move
            enemyMove = enemyData.lastMove || "unknown";

            // Determine the battle result
            if (playerData.thisPlayerWin === true) {
              battleResult = "win";
            } else if (enemyData.thisPlayerWin === true) {
              battleResult = "lose";
            } else {
              battleResult = "draw";
            }

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

            // Update enemy stats
            state.enemyHealth = enemyData.health.current.toString();
            state.enemyMaxHealth = enemyData.health.currentMax.toString();
            state.enemyShield = enemyData.shield.current.toString();
            state.enemyMaxShield = enemyData.shield.currentMax.toString();

            // Update battle result and enemy move
            state.lastBattleResult = battleResult;
            state.lastEnemyMove = enemyMove;

            // Update loot phase status
            state.lootPhase = (result.data.run.lootPhase || false).toString();

            // Update loot options if available
            if (
              result.data.run.lootOptions &&
              result.data.run.lootOptions.length > 0
            ) {
              state.lootOptions = result.data.run.lootOptions;
              state.currentLoot = result.data.run.lootOptions.length.toString();
            }

            // Update room information
            if (result.data.entity) {
              state.currentRoom = result.data.entity.ROOM_NUM_CID.toString();
              state.currentDungeon =
                result.data.entity.DUNGEON_ID_CID.toString();
              state.currentEnemy = result.data.entity.ENEMY_CID.toString();
            }

            console.log("state", state);
          }

          return {
            success: true,
            result,
            message: `
            Successfully performed ${action} attack in dungeon ${dungeonId}

            Enemy Move: ${enemyMove}
            Battle Result: ${battleResult}

            Player Health: ${state.playerHealth}
            Player Max Health: ${state.playerMaxHealth}
            Player Shield: ${state.playerShield}
            Player Max Shield: ${state.playerMaxShield}
            

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
     * Action to fetch upcoming enemies data
     */
    action({
      name: "getUpcomingEnemies",
      description:
        "Fetch information about all upcoming enemies in the dungeon",
      schema: z.object({}), // No parameters needed for this GET request
      async handler(_call: ActionCall<{}>, _ctx: any, _agent: Agent) {
        try {
          // Log the action to the UI
          // simpleUI.logAgentAction("Fetching upcoming enemies", null);

          const response = await fetch(`${getApiBaseUrl()}/indexer/enemies`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GIGA_TOKEN}`,
            },
          });

          if (!response.ok) {
            throw new Error(
              `Fetch enemies failed with status ${response.status}`
            );
          }

          const result = await response.json();

          return {
            success: true,
            enemies: result,
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
    action({
      name: "getPlayerState",
      description: "Fetch the current state of the player in the dungeon",
      schema: z.object({}), // No parameters needed for this GET request
      async handler(_call: ActionCall<{}>, ctx: any, _agent: Agent) {
        try {
          // Log the action to the UI
          // simpleUI.logAgentAction("Fetching player state", null);

          const response = await fetch(
            `${getApiBaseUrl()}/game/dungeon/state`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GIGA_TOKEN}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(
              `Fetch player state failed with status ${response.status}`
            );
          }

          const result = await response.json();

          console.log("result", result);

          // Update game state in the UI if available
          if (result.gameState) {
            // simpleUI.printGameState(result.gameState);
          }

          // Update the state with player data
          if (
            result.data &&
            result.data.run &&
            result.data.run.players &&
            result.data.run.players.length > 0
          ) {
            const state = initializeAgentMemory(ctx);
            const playerData = result.data.run.players[0]; // First player is the user

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

            // Update loot phase status
            state.lootPhase = (result.data.run.lootPhase || false).toString();

            // Update loot options if available
            if (
              result.data.run.lootOptions &&
              result.data.run.lootOptions.length > 0
            ) {
              state.lootOptions = result.data.run.lootOptions;
              state.currentLoot = result.data.run.lootOptions.length.toString();
            }

            // Update room information if available
            if (result.data.entity) {
              state.currentRoom = result.data.entity.ROOM_NUM_CID.toString();
              state.currentDungeon =
                result.data.entity.DUNGEON_ID_CID.toString();
              state.currentEnemy = result.data.entity.ENEMY_CID.toString();
            }

            // Update enemy stats if available
            if (result.data.run.players.length > 1) {
              const enemyData = result.data.run.players[1]; // Second player is the enemy
              state.enemyHealth = enemyData.health.current.toString();
              state.enemyMaxHealth = enemyData.health.currentMax.toString();
              state.enemyShield = enemyData.shield.current.toString();
              state.enemyMaxShield = enemyData.shield.currentMax.toString();

              // Update battle result and enemy move if available
              if (enemyData.lastMove) {
                state.lastEnemyMove = enemyData.lastMove;

                // Determine battle result based on thisPlayerWin and otherPlayerWin properties
                if (playerData.thisPlayerWin === true) {
                  state.lastBattleResult = "win";
                } else if (enemyData.thisPlayerWin === true) {
                  state.lastBattleResult = "lose";
                } else {
                  state.lastBattleResult = "draw";
                }
              }
            }

            // Display the updated state to the user
            // simpleUI.printDetailedGameState(state);
          }

          return {
            success: true,
            playerState: result,
            message: "Successfully fetched player's dungeon state",
          };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("Error fetching player state:", error);

          return {
            success: false,
            error: errorMessage,
            message: "Failed to fetch player's dungeon state",
          };
        }
      },
    }),

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
          .describe("The ID of the dungeon to start. Default is 1."),
      }),
      async handler(
        call: ActionCall<{
          dungeonId: number;
        }>,
        ctx: any,
        _agent: Agent
      ) {
        try {
          // Log the action to the UI
          // simpleUI.logAgentAction(
          //   `Starting new run in dungeon ${call.data.dungeonId}`,
          //   null
          // );

          const { dungeonId } = call.data;

          const payload = {
            action: "start_run",
            actionToken: "",
            dungeonId: dungeonId,
            data: {
              consumables: [],
              itemId: 0,
              index: 0,
            },
          };

          const response = await fetch(
            `${getApiBaseUrl()}/game/dungeon/action`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GIGA_TOKEN}`,
              },
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            throw new Error(
              `Start new run failed with status ${response.status}`
            );
          }

          const result = await response.json();

          // // Update game state in the UI
          // if (result.gameState) {
          //   simpleUI.printGameState(result.gameState);
          // }

          // // Update player stats in the UI
          // if (result.playerState) {
          //   simpleUI.printPlayerStats(result.playerState);
          // }

          // Update the state with the new run data
          if (
            result.data &&
            result.data.run &&
            result.data.run.players &&
            result.data.run.players.length > 0
          ) {
            const state = initializeAgentMemory(ctx);
            const playerData = result.data.run.players[0]; // First player is the user

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

          return {
            success: true,
            result,
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

    /**
     * Action to manually update the state with provided data
     * This is useful for debugging or when there's a conflict in state
     */
    action({
      name: "manuallyUpdateState",
      description: "Manually update the state with provided data",
      schema: z.object({
        stateData: z.any().optional().describe("The state data to update with"),
      }),
      async handler(
        call: ActionCall<{
          stateData?: any;
        }>,
        ctx: any,
        _agent: Agent
      ) {
        try {
          const { stateData } = call.data;

          if (!stateData) {
            return {
              success: false,
              error: "No state data provided",
              message: "Failed to manually update state: No data provided",
            };
          }

          const state = initializeAgentMemory(ctx);

          if (
            stateData.data &&
            stateData.data.run &&
            stateData.data.run.players &&
            stateData.data.run.players.length > 0
          ) {
            const playerData = stateData.data.run.players[0]; // First player is the user

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

            // Update loot phase status
            state.lootPhase = (
              stateData.data.run.lootPhase || false
            ).toString();

            // Update loot options if available
            if (
              stateData.data.run.lootOptions &&
              stateData.data.run.lootOptions.length > 0
            ) {
              state.lootOptions = stateData.data.run.lootOptions;
              state.currentLoot =
                stateData.data.run.lootOptions.length.toString();
            }

            // Update room information if available
            if (stateData.data.entity) {
              state.currentRoom = stateData.data.entity.ROOM_NUM_CID.toString();
              state.currentDungeon =
                stateData.data.entity.DUNGEON_ID_CID.toString();
              state.currentEnemy = stateData.data.entity.ENEMY_CID.toString();
            }

            // Update enemy stats if available
            if (stateData.data.run.players.length > 1) {
              const enemyData = stateData.data.run.players[1]; // Second player is the enemy
              state.enemyHealth = enemyData.health.current.toString();
              state.enemyMaxHealth = enemyData.health.currentMax.toString();
              state.enemyShield = enemyData.shield.current.toString();
              state.enemyMaxShield = enemyData.shield.currentMax.toString();

              // Update battle result and enemy move if available
              if (enemyData.lastMove) {
                state.lastEnemyMove = enemyData.lastMove;

                // Determine battle result based on thisPlayerWin and otherPlayerWin properties
                if (playerData.thisPlayerWin === true) {
                  state.lastBattleResult = "win";
                } else if (enemyData.thisPlayerWin === true) {
                  state.lastBattleResult = "lose";
                } else {
                  state.lastBattleResult = "draw";
                }
              }
            }

            return {
              success: true,
              message: "Successfully updated state with provided data",
              updatedState: state,
            };
          }

          return {
            success: false,
            error: "No valid state data provided",
            message:
              "Failed to manually update state: No valid state data provided",
          };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("Error manually updating state:", error);

          return {
            success: false,
            error: errorMessage,
            message: "Failed to manually update state",
          };
        }
      },
    }),
  ],
  // memory: {
  //   store: createMemoryStore(),
  //   vector: createChromaVectorStore("agent", "http://localhost:8000"),
  //   vectorModel: openai("gpt-4-turbo"),
  // },
});

// Start the agent with initial goals
// simpleUI.logMessage(LogLevel.INFO, "Starting agent with initial goals...");

// agent.start({
//   id: "gigaverse-game",
//   initialGoal:
//     "Progress as far as possible in the dungeon by making strategic rock-paper-scissors decisions. Don't ever stop. Just start a new run if you die.",
//   initialTasks: [
//     "Check player state to understand current situation",
//     "Fetch information about upcoming enemies",
//     "Start a new run if not already in a dungeon",
//     "Make strategic combat decisions based on enemy patterns",
//     "Select optimal loot to improve chances of survival",
//   ],
// });

// Display welcome message
// simpleUI.logMessage(
//   LogLevel.INFO,
//   "Gigaverse Dream Agent is now running! The agent will automatically play the game."
// );

// // Handle exit
// process.on("SIGINT", () => {
//   simpleUI.logMessage(LogLevel.INFO, "Shutting down agent...");
//   process.exit(0);
// });
