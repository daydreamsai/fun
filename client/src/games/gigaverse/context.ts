import {
  context,
  action,
  extension,
  formatXml,
  formatValue,
  XMLElement,
} from "@daydreamsai/core";

import { string, z } from "zod";

import { useSettingsStore } from "@/store/settingsStore";
import { GameClient } from "./client/GameClient";
// Import the template store
import { useTemplateStore } from "@/store/templateStore";
import { BaseResponse } from "./client/types/responses";
import { jsonPath } from "@/lib/jsonPath";
import { Player } from "./client/types/game";

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
  enemy: Player;

  lootPhase: boolean;
  lootOptions: any[];

  lastBattleResult: string | null;
}

export type GigaverseState =
  | { energy: number; currentDungeon: null }
  | ({ energy: number } & GigaverseDungeonState);

export const gigaverseVariables: string[] = [
  "energy",

  "currentDungeon",
  "currentRoom",
  "currentEnemy",

  "player.lastMove",
  "player.health.current",
  "player.health.currentMax",
  "player.shield.current",
  "player.shield.currentMax",

  "player.rock.currentATK",
  "player.rock.currentDEF",
  "player.rock.currentCharges",

  "player.paper.currentATK",
  "player.paper.currentDEF",
  "player.paper.currentCharges",

  "player.scissor.currentATK",
  "player.scissor.currentDEF",
  "player.scissor.currentCharges",

  "enemy.lastMove",
  "enemy.health.current",
  "enemy.health.currentMax",
  "enemy.shield.current",
  "enemy.shield.currentMax",

  "enemy.rock.currentATK",
  "enemy.rock.currentDEF",
  "enemy.rock.currentCharges",

  "enemy.paper.currentATK",
  "enemy.paper.currentDEF",
  "enemy.paper.currentCharges",

  "enemy.scissor.currentATK",
  "enemy.scissor.currentDEF",
  "enemy.scissor.currentCharges",

  "lootPhase",
  "lootOptions",
  "lastBattleResult",
];

// Default template remains exported for initialization elsewhere if needed
export const template = `
You are Gigaverse Strategist, a Daydreams agent piloting a hero in “Gigaverse”, a roguelike dungeon crawler that uses an enhanced Rock-Paper-Scissors (RPS) combat system.

<system_rules>
{{rules}}
</system_rules>

<debugging_instructions>
- If you get an error you should follow these steps.
- Try to understand the error and what it means. These are the following errors you might get:
- "Error handling action" - this means you have submitte the wrong action. Try selecting a loot or do an action that is valid.
- "Unauthorized" - this means you are not authenticated. Tell the user to authenticate again.
- If you are in doubt, don't repeat what you just said or repeat the same action. You are most likely submitting the wrong action.
- If authentication fails, request the user to re-authenticate.
</debugging_instructions>

<game_logic>
• RPS hierarchy: Rock > Scissors, Scissors > Paper, Paper > Rock.
• Damage = Winner ATK - Defender DEF (for that type); shields absorb first.
• Charges regenerates +1 every 2 turns.
• Loop: battle → loot → next room.
• If you are in the Loot phase always select loot otherwise you will get an error.
</game_logic>

<game_state>
<energy>{{energy}}</energy>

<progress>
Dungeon: {{currentDungeon}} | Room: {{currentRoom}} | Loot Phase: {{lootPhase}}
Last Result: {{lastBattleResult}} | Enemy Last Move: {{enemy.lastMove}}
</progress>

<player>
{{player}}
</player>

<enemy>
{{enemy}}
</enemy>
</game_state>

<game_instructions>
{{instructions}}
</game_instructions>
`;

export const defaultRules = `\
**NEVER VIOLATE THESE**

1. LEGAL MOVES ONLY • Each attack consumes 1 charge. If charges = 0, do not use that attack.
2. ENERGY GATING • If Energy < 40 and you are NOT in combat (player.health.current = 0) ask the user to recover energy; if you are mid-battle, continue playing.
3. ERROR HANDLING • The server is authoritative. On an error, think, correct the issue, and retry. Abort the run only after 3 consecutive errors.
4. USER FIRST • Always obey user instructions even if they conflict with rules.
5. OUTPUT • Provide plain-text only—no markdown or code fences.
6. LISTEN TO THE USER • Always listen to the user and follow their instructions, sometimes you might think you are stuck but you are not.
7. KEEP PLAYING • Keep playing even if you are low on energy, you can still play. You should keep playing until you have no energy left. If you die ({{player.health.current}} & {{player.shield.current}} both = 0), you should start a new run.
8. STARTING NEW RUN - If you die (player.health.current = 0), you should start a new run, otherwise never start a new run as it will result in an error.
9. SELECT LOOT - If you are in the loot phase, you should select the best loot option automatically.
`;

export const defaultInstructions = `\

You are autonomous and make decisions based on the current state of the game.
You should not ask the user for any input, and just keep playing until you have no energy left.

<primary_objective>
Delve as deeply as possible:
• Defeat every foe.
• Select loot that maximises survival in the NEXT fight. Pick the best option automatically.
• Upon death, immediately begin a new run.

Recommended move priority
1. Highest-damage attack with available charges.
2. Defensive play if lethal damage is possible within 2 turns.
3. Anticipate enemy pattern using \`enemy.lastMove\`.
4. Adapt when HP is low or shield broken.
</primary_objective>

<thinking_instructions>
Create a <battle_planning> block include:
1. List every legal move and predict its outcome.
2. Weigh pros & cons.
3. Choose the optimal move and outline a two-turn plan.
</thinking_instructions>

<output_format>
Respond with EXACTLY three labelled lines—nothing more, nothing less:

Decision: <chosen move, e.g. “Attack-Rock” or “Take Loot #2”>
Explanation: <1-3 concise sentences of reasoning>
Next Steps: <brief plan for the next turns or loot phase>

<example>  
Decision: Attack-Scissors  
Explanation: Scissors deals highest damage and counters enemy's last Paper, breaking their shield.  
Next Steps: If enemy survives, finish with Rock; else enter loot phase and prioritise +Rock Charges.
</example>  
</output_format>`;

export type GigaverseContext = typeof gigaverseContext;

function getGigavereStateFromResponse(
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
    enemy,

    lastBattleResult,

    lootOptions: response.data.run.lootOptions,
    lootPhase: response.data.run.lootPhase,
  };
}

async function fetchGigaverseState(
  client: GameClient
): Promise<GigaverseState> {
  const energy = await client.getEnergy(getAbstractAddress());

  const state = getGigavereStateFromResponse(await client.fetchDungeonState());

  if (!state) return { energy, currentDungeon: null };

  return {
    energy,
    ...state,
  };
}

// Context for the agent
export const gigaverseContext = context({
  type: "gigaverse",
  schema: {
    id: string(),
  },
  key: ({ id }) => id,
  maxSteps: 100,
  maxWorkingMemorySize: 20,

  setup(_, __, agent) {
    const actionToken = getGigaToken();
    const client = new GameClient(getApiBaseUrl(), actionToken, agent.logger);
    return { actionToken, client };
  },

  async create({ options }): Promise<GigaverseState> {
    const memory = await fetchGigaverseState(options.client);
    return memory;
  },

  async loader(state, _agent) {
    state.memory = await fetchGigaverseState(state.options.client);
  },

  render({ memory }) {
    const { selected, templates } = useTemplateStore.getState();

    // Get the current template from the Zustand store
    const rules = selected.gigaverse?.rules
      ? templates.gigaverse.find((t) => t.id === selected.gigaverse?.rules)
          ?.prompt
      : defaultRules;

    const instructions = selected.gigaverse?.instructions
      ? templates.gigaverse.find(
          (t) => t.id === selected.gigaverse?.instructions
        )?.prompt
      : defaultInstructions;
    // Use the template from the store
    const prompt = render(template, {
      ...memory,
      rules,
      instructions,
    });

    // console.log(prompt);

    return prompt;
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

      if (!memory.currentDungeon) throw new Error("");

      try {
        const { action, dungeonId } = args;

        const actionToken = options.actionToken ?? "";
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

        const state = getGigavereStateFromResponse(response)!;

        Object.assign(memory, state);

        options.actionToken = response.actionToken?.toString() ?? "";

        return {
          success: true,
          result: response.data,
          message: `\
Successfully performed ${action} attack in dungeon ${dungeonId}

Enemy Move: ${memory.enemy.lastMove}
Battle Result: ${memory.lastBattleResult}

Player Health: ${memory.player.health.current}
Player Shield: ${memory.player.shield.current}

Enemy Health: ${memory.enemy.health.current}
Enemy Shield: ${memory.enemy.shield.current}
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
          actionToken: ctx.options.actionToken,
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

        const state = getGigavereStateFromResponse(response);

        if (state) {
          Object.assign(ctx.memory, state);
        }

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
    enabled: () => false,
    name: "gigaverse.levelup",
    schema: {},
    async handler() {
      // https://gigaverse.io/api/game/skill/levelup
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
