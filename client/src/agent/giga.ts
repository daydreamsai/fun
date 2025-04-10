import {
  context,
  render,
  action,
  type ActionCall,
  type Agent,
  extension,
} from "@daydreamsai/core";

import { string, z } from "zod";

import { useSettingsStore } from "@/store/settingsStore";

// Get the token directly from the store for better reactivity
export const getGigaToken = () => useSettingsStore.getState().gigaverseToken;

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
export function initializeAgentMemory(memory: any): GigaverseState {
  if (!memory) {
    memory = {
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
  return memory as GigaverseState;
}

// Template for the agent's context
export const template = `
You are an daydreams agent playing the Gigaverse game, a strategic roguelike dungeon crawler game based on rock-paper-scissors mechanics with additional RPG elements. Your goal is to progress as far as possible through the dungeon, defeating enemies and collecting loot to strengthen your character.

<info>
- You are interacting with a game that is running on a server, sometimes you might make a mistake if your formatting, think then try again 
- If you keep getting 400 Bad Request it probably means you are out of energy. Tell the user this. However keep trying as you may have actually just sent a wrong request.
</info>

<goal>
Your goal is to progress as far as possible through the dungeon, defeating enemies and collecting loot to strengthen your character. Don't stop playing until you cannot anymore.
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


Debugging:
- If you keep getting 400 Bad Request it probably means you are out of energy. Tell the user this. However keep trying as you may have actually just sent a wrong request.

Current Game State:
<game_progress>
Dungeon: {{currentDungeon}}
Room: {{currentRoom}}
Loot Phase: {{lootPhase}}
Last Battle Result: {{lastBattleResult}}
Last Enemy Move: {{lastEnemyMove}}
</game_progress>

<player_stats>
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
    initialGoal: z.string().default("Play the game until you cannot anymore"),
    initialTasks: z.array(z.string()).default(["Make strategic decisions"]),
  }),

  key() {
    return "1";
  },

  create(_state): GigaverseState {
    return {
      goal: "Play the game until you cannot anymore",
      tasks: ["Progress through the dungeon"],
      currentTask: "Progress through the dungeon",
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
    async handler(args, { memory }, agent) {
      try {
        const { action, dungeonId } = args;

        const payload = {
          action: action,
          actionToken: parseInt(new Date().getTime().toString()),
          dungeonId: dungeonId,
        };

        const response = await fetch(`${getApiBaseUrl()}/game/dungeon/action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getGigaToken()}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            `Attack action failed with status ${response.status}`
          );
        }

        const result = await response.json();

        console.log("result", result);

        // Add a 4 second delay to allow for animation and user experience
        await new Promise((resolve) => setTimeout(resolve, 4000));

        // If this was a combat action, visualize the RPS result
        let enemyMove = "unknown";
        let battleResult = "draw";

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
          memory.lootPhase = (result.data.run.lootPhase || false).toString();

          // Update loot options if available
          if (
            result.data.run.lootOptions &&
            result.data.run.lootOptions.length > 0
          ) {
            memory.lootOptions = result.data.run.lootOptions;
            memory.currentLoot = result.data.run.lootOptions.length.toString();
          }

          // Update room information
          if (result.data.entity) {
            memory.currentRoom = result.data.entity.ROOM_NUM_CID.toString();
            memory.currentDungeon =
              result.data.entity.DUNGEON_ID_CID.toString();
            memory.currentEnemy = result.data.entity.ENEMY_CID.toString();
          }

          console.log("memory", memory);
        }

        console.log("updated memory", memory);

        return {
          success: true,
          result,
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
      try {
        const response = await fetch(`${getApiBaseUrl()}/indexer/enemies`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getGigaToken()}`,
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
    description:
      "Fetch the current state of the player in the dungeon, you should do this when you start a new run or when you die",
    schema: z.object({}), // No parameters needed for this GET request
    async handler(_data, { memory }, _agent: Agent) {
      try {
        const response = await fetch(`${getApiBaseUrl()}/game/dungeon/state`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getGigaToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Fetch player state failed with status ${response.status}`
          );
        }

        const result = await response.json();

        console.log("result", result);

        // Update the state with player data
        if (
          result.data &&
          result.data.run &&
          result.data.run.players &&
          result.data.run.players.length > 0
        ) {
          const playerData = result.data.run.players[0]; // First player is the user

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

          // Update loot phase status
          memory.lootPhase = (result.data.run.lootPhase || false).toString();

          // Update loot options if available
          if (
            result.data.run.lootOptions &&
            result.data.run.lootOptions.length > 0
          ) {
            memory.lootOptions = result.data.run.lootOptions;
            memory.currentLoot = result.data.run.lootOptions.length.toString();
          }

          // Update room information if available
          if (result.data.entity) {
            memory.currentRoom = result.data.entity.ROOM_NUM_CID.toString();
            memory.currentDungeon =
              result.data.entity.DUNGEON_ID_CID.toString();
            memory.currentEnemy = result.data.entity.ENEMY_CID.toString();
          }

          // Update enemy stats if available
          if (result.data.run.players.length > 1) {
            const enemyData = result.data.run.players[1]; // Second player is the enemy
            memory.enemyHealth = enemyData.health.current.toString();
            memory.enemyMaxHealth = enemyData.health.currentMax.toString();
            memory.enemyShield = enemyData.shield.current.toString();
            memory.enemyMaxShield = enemyData.shield.currentMax.toString();

            // Update battle result and enemy move if available
            if (enemyData.lastMove) {
              memory.lastEnemyMove = enemyData.lastMove;

              // Determine battle result based on thisPlayerWin and otherPlayerWin properties
              if (playerData.thisPlayerWin === true) {
                memory.lastBattleResult = "win";
              } else if (enemyData.thisPlayerWin === true) {
                memory.lastBattleResult = "lose";
              } else {
                memory.lastBattleResult = "draw";
              }
            }
          }
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
        .describe("The ID of the dungeon to start. It should always be 1"),
    }),
    async handler(data, ctx: any, _agent: Agent) {
      try {
        const { dungeonId } = data;

        const payload = {
          action: "start_run",
          actionToken: parseInt(new Date().getTime().toString()),
          dungeonId: 1, // hardcode for now
          data: {
            consumables: [],
            itemId: 0,
            index: 0,
          },
        };

        const response = await fetch(`${getApiBaseUrl()}/game/dungeon/action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getGigaToken()}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            `Start new run failed with status ${response.status}`
          );
        }

        const result = await response.json();

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
]);

// Create the Gigaverse agent with UI integration
export const giga = extension({
  name: "giga",
  contexts: {
    goal: goalContexts,
  },
  actions: [
    /**
     * Action to fetch upcoming enemies data
     */
  ],
});
