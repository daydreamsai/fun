import {
  findOptimalMove,
  lootStrategies,
  selectBestLoot,
  explainLootChoice,
} from "./combat-simulator";
import { GigaverseDungeonState, LootOption } from "./client/types/game";

// Example integration function that generates combat reasoning
export function generateCombatDecision(state: GigaverseDungeonState): string {
  const { bestMove, evaluation, allEvaluations } = findOptimalMove(state);

  // Format the analysis for the agent
  let analysis = `Combat Analysis:\n`;
  analysis += `Current State - Player HP: ${state.player.health.current}/${state.player.health.currentMax}, `;
  analysis += `Shield: ${state.player.shield.current}/${state.player.shield.currentMax}\n`;
  analysis += `Enemy HP: ${state.enemy.health.current}/${state.enemy.health.currentMax}, `;
  analysis += `Shield: ${state.enemy.shield.current}/${state.enemy.shield.currentMax}\n\n`;

  analysis += `Move Evaluations:\n`;
  for (const moveEval of allEvaluations) {
    analysis += `- ${moveEval.move}: EV=${moveEval.expectedValue.toFixed(2)}`;
    if (moveEval.wouldDeplete) analysis += ` (Would deplete!)`;
    if (moveEval.guaranteesWin) analysis += ` (Guarantees win!)`;
    analysis += `\n`;
  }

  analysis += `\nOptimal Move: ${bestMove}\n`;
  analysis += `Reasoning: `;

  if (evaluation.guaranteesWin) {
    analysis += `This move guarantees victory by dealing lethal damage in all scenarios.`;
  } else if (evaluation.wouldDeplete && !evaluation.guaranteesWin) {
    analysis += `Although this has the highest raw EV, we're preserving charges for future flexibility.`;
  } else {
    analysis += `This move maximizes expected value while maintaining strategic reserves.`;
  }

  return analysis;
}

// Example loot decision function
export function generateLootDecision(
  lootOptions: LootOption[],
  state: GigaverseDungeonState,
  strategyName: keyof typeof lootStrategies = "balanced"
): {
  decision: number;
  explanation: string;
} {
  const { bestOption, bestIndex, scores } = selectBestLoot(
    lootOptions,
    state,
    strategyName
  );
  const explanation = explainLootChoice(bestOption, scores, strategyName);

  return {
    decision: bestIndex,
    explanation,
  };
}

// Example mission configuration with loot strategy
export interface EnhancedMissionConfig {
  type: "dungeon";
  numberOfRuns: number;
  selectedDungeon: number | null;
  selectedDungeonId: string | null;
  useConsumables: boolean;
  lootStrategy: keyof typeof lootStrategies;
}

// Updated instructions template that incorporates EV-based combat
export const enhancedCombatInstructions = `
### **Combat Decision Protocol**

When in combat, you will use mathematical Expected Value (EV) calculations to determine optimal moves:

1. **EV Calculation**: For each available move, calculate the expected damage output and damage taken across all possible enemy moves.
2. **Charge Conservation**: Never deplete your last charge unless it guarantees victory.
3. **Output Format**: Your combat decisions should reference the EV calculations:

Decision: <Move with highest EV that respects charge conservation>
Explanation: EV analysis shows this move has expected value of X, accounting for all enemy possibilities.
Next Steps: <Your tactical plan based on the mathematical outcomes>

### **Loot Strategy Implementation**

Your loot selection will follow the configured strategy:
- **balanced**: Select highest tier items regardless of type
- **glassCanon**: Prioritize attack upgrades (2x weight)
- **tank**: Prioritize defense and healing (2x weight)
- **twoMoveSpecialist**: Focus on upgrading only two attack types

The strategy is defined in your mission parameters as "lootStrategy".
`;

// Function to enhance the existing prompts with EV-based combat
export function enhancePromptsWithEVCombat(
  existingInstructions: string,
  missionConfig: EnhancedMissionConfig
): string {
  // Replace the heuristic combat section with EV-based instructions
  const enhancedInstructions = existingInstructions.replace(
    /\*\*Strategic Imperatives \(Combat\):\*\*[\s\S]*?\*\*Activity Protocol:/,
    enhancedCombatInstructions + "\n\n**Activity Protocol:"
  );

  // Add loot strategy to mission parameters
  const configWithStrategy = {
    ...missionConfig,
    lootStrategy: missionConfig.lootStrategy || "balanced",
  };

  return enhancedInstructions.replace(
    /\{[^}]*"type": "dungeon"[^}]*\}/,
    JSON.stringify(configWithStrategy, null, 2)
  );
}
