import { GigaverseDungeonState, LootOption } from "./client/types/game";

// Type definitions for combat simulation
interface CombatMove {
  type: "rock" | "paper" | "scissors" | "defend";
  damage: number;
  charges: number;
}

interface CombatOutcome {
  playerDamageDealt: number;
  playerDamageTaken: number;
  playerShieldChange: number;
  enemyShieldChange: number;
  playerHealthAfter: number;
  enemyHealthAfter: number;
}

interface MoveEvaluation {
  move: string;
  expectedValue: number;
  outcomes: Record<string, CombatOutcome>;
  wouldDeplete: boolean;
  guaranteesWin: boolean;
}

// Rock-Paper-Scissors damage multipliers
const DAMAGE_MULTIPLIERS = {
  win: 2.0, // When your move beats theirs
  lose: 0.5, // When their move beats yours
  tie: 1.0, // When moves are the same
};

type MoveType = "rock" | "paper" | "scissors";
type MatchupResult = "win" | "lose" | "tie";

// Get the damage multiplier for a matchup
function getDamageMultiplier(playerMove: string, enemyMove: string): number {
  if (playerMove === "defend" || enemyMove === "defend") return 1.0;

  const matchups: Record<MoveType, Record<MoveType, MatchupResult>> = {
    rock: { scissors: "win", paper: "lose", rock: "tie" },
    paper: { rock: "win", scissors: "lose", paper: "tie" },
    scissors: { paper: "win", rock: "lose", scissors: "tie" },
  };

  const result =
    matchups[playerMove as MoveType]?.[enemyMove as MoveType] || "tie";
  return DAMAGE_MULTIPLIERS[result];
}

// Calculate the outcome of a specific move combination
function simulateCombat(
  playerMove: CombatMove,
  enemyMove: CombatMove,
  playerHealth: number,
  playerShield: number,
  enemyHealth: number,
  enemyShield: number
): CombatOutcome {
  let playerDamageDealt = 0;
  let playerDamageTaken = 0;
  let playerShieldChange = 0;
  let enemyShieldChange = 0;

  // Handle defend moves
  if (playerMove.type === "defend") {
    playerShieldChange = 5; // Standard shield gain from defend
  } else {
    // Calculate damage dealt by player
    const damageMultiplier = getDamageMultiplier(
      playerMove.type,
      enemyMove.type
    );
    playerDamageDealt = Math.floor(playerMove.damage * damageMultiplier);
  }

  if (enemyMove.type === "defend") {
    enemyShieldChange = 5; // Standard shield gain from defend
  } else {
    // Calculate damage taken by player
    const damageMultiplier = getDamageMultiplier(
      enemyMove.type,
      playerMove.type
    );
    playerDamageTaken = Math.floor(enemyMove.damage * damageMultiplier);
  }

  // Apply damage to shields first, then health
  let enemyShieldAfter = enemyShield + enemyShieldChange;
  let remainingDamageToEnemy = playerDamageDealt;
  if (remainingDamageToEnemy > enemyShieldAfter) {
    remainingDamageToEnemy -= enemyShieldAfter;
    enemyShieldAfter = 0;
  } else {
    enemyShieldAfter -= remainingDamageToEnemy;
    remainingDamageToEnemy = 0;
  }
  const enemyHealthAfter = Math.max(0, enemyHealth - remainingDamageToEnemy);

  let playerShieldAfter = playerShield + playerShieldChange;
  let remainingDamageToPlayer = playerDamageTaken;
  if (remainingDamageToPlayer > playerShieldAfter) {
    remainingDamageToPlayer -= playerShieldAfter;
    playerShieldAfter = 0;
  } else {
    playerShieldAfter -= remainingDamageToPlayer;
    remainingDamageToPlayer = 0;
  }
  const playerHealthAfter = Math.max(0, playerHealth - remainingDamageToPlayer);

  return {
    playerDamageDealt,
    playerDamageTaken,
    playerShieldChange,
    enemyShieldChange,
    playerHealthAfter,
    enemyHealthAfter,
  };
}

// Extract available moves from game state
function getAvailableMoves(state: GigaverseDungeonState): CombatMove[] {
  const moves: CombatMove[] = [];

  // Add attack moves if they have charges
  if (state.player.rock.currentCharges > 0) {
    moves.push({
      type: "rock",
      damage: state.player.rock.currentATK,
      charges: state.player.rock.currentCharges,
    });
  }

  if (state.player.paper.currentCharges > 0) {
    moves.push({
      type: "paper",
      damage: state.player.paper.currentATK,
      charges: state.player.paper.currentCharges,
    });
  }

  if (state.player.scissor.currentCharges > 0) {
    moves.push({
      type: "scissors",
      damage: state.player.scissor.currentATK,
      charges: state.player.scissor.currentCharges,
    });
  }

  // Defend is always available
  moves.push({
    type: "defend",
    damage: 0,
    charges: Infinity,
  });

  return moves;
}

// Get possible enemy moves (assuming they have charges)
function getPossibleEnemyMoves(state: GigaverseDungeonState): CombatMove[] {
  const moves: CombatMove[] = [];

  if (state.enemy.rock.currentCharges > 0) {
    moves.push({
      type: "rock",
      damage: state.enemy.rock.currentATK,
      charges: state.enemy.rock.currentCharges,
    });
  }

  if (state.enemy.paper.currentCharges > 0) {
    moves.push({
      type: "paper",
      damage: state.enemy.paper.currentATK,
      charges: state.enemy.paper.currentCharges,
    });
  }

  if (state.enemy.scissor.currentCharges > 0) {
    moves.push({
      type: "scissors",
      damage: state.enemy.scissor.currentATK,
      charges: state.enemy.scissor.currentCharges,
    });
  }

  // Enemies might also defend
  moves.push({
    type: "defend",
    damage: 0,
    charges: Infinity,
  });

  return moves;
}

// Calculate expected value of a move assuming random enemy behavior
export function evaluateMove(
  playerMove: CombatMove,
  state: GigaverseDungeonState
): MoveEvaluation {
  const enemyMoves = getPossibleEnemyMoves(state);
  const outcomes: Record<string, CombatOutcome> = {};
  let totalValue = 0;
  let guaranteesWin = true;

  // Simulate against each possible enemy move
  for (const enemyMove of enemyMoves) {
    const outcome = simulateCombat(
      playerMove,
      enemyMove,
      state.player.health.current,
      state.player.shield.current,
      state.enemy.health.current,
      state.enemy.shield.current
    );

    outcomes[
      `vs${enemyMove.type.charAt(0).toUpperCase() + enemyMove.type.slice(1)}`
    ] = outcome;

    // Calculate value: prioritize enemy damage, minimize player damage
    // This is a simple heuristic - could be made more sophisticated
    const moveValue =
      outcome.playerDamageDealt -
      outcome.playerDamageTaken +
      (outcome.playerShieldChange - outcome.enemyShieldChange) * 0.5;

    totalValue += moveValue;

    // Check if this move guarantees a win
    if (outcome.enemyHealthAfter > 0) {
      guaranteesWin = false;
    }
  }

  // Calculate average expected value
  const expectedValue = totalValue / enemyMoves.length;

  // Check if this move would deplete our charges
  const wouldDeplete = playerMove.charges === 1 && playerMove.type !== "defend";

  // Format move name
  const moveTypeCapitalized =
    playerMove.type.charAt(0).toUpperCase() + playerMove.type.slice(1);
  const moveName =
    playerMove.type === "defend" ? "Defend" : `Attack-${moveTypeCapitalized}`;

  return {
    move: moveName,
    expectedValue,
    outcomes,
    wouldDeplete,
    guaranteesWin,
  };
}

// Main function to find the best move
export function findOptimalMove(state: GigaverseDungeonState): {
  bestMove: string;
  evaluation: MoveEvaluation;
  allEvaluations: MoveEvaluation[];
} {
  const availableMoves = getAvailableMoves(state);
  const evaluations: MoveEvaluation[] = [];

  // Evaluate each possible move
  for (const move of availableMoves) {
    const evaluation = evaluateMove(move, state);
    evaluations.push(evaluation);
  }

  // Sort by expected value (highest first)
  evaluations.sort((a, b) => b.expectedValue - a.expectedValue);

  // Find the best move considering charge conservation
  let bestEvaluation = evaluations[0];

  // If the best move would deplete charges and doesn't guarantee a win,
  // look for the next best move that preserves charges
  if (bestEvaluation.wouldDeplete && !bestEvaluation.guaranteesWin) {
    for (const evaluation of evaluations) {
      if (!evaluation.wouldDeplete || evaluation.guaranteesWin) {
        bestEvaluation = evaluation;
        break;
      }
    }
  }

  return {
    bestMove: bestEvaluation.move,
    evaluation: bestEvaluation,
    allEvaluations: evaluations,
  };
}

// Loot strategy definitions
export interface LootStrategy {
  name: string;
  description: string;
  evaluateLoot: (
    lootOptions: LootOption[],
    currentState: GigaverseDungeonState
  ) => number[];
}

export const lootStrategies: Record<string, LootStrategy> = {
  balanced: {
    name: "Balanced",
    description: "Prioritize highest tier upgrades regardless of type",
    evaluateLoot: (lootOptions, state) => {
      return lootOptions.map((option) => {
        // Base score on rarity (higher is better)
        let score = option.RARITY_CID || 1;

        // Additional scoring based on the upgrade values
        score += (option.selectedVal1 + option.selectedVal2) * 0.1;

        return score;
      });
    },
  },

  glassCanon: {
    name: "Glass Canon",
    description: "Prioritize attack upgrades over defense",
    evaluateLoot: (lootOptions, state) => {
      return lootOptions.map((option) => {
        let score = option.RARITY_CID || 1;

        // Check if this is an attack upgrade based on boonTypeString
        const isAttackUpgrade =
          option.boonTypeString?.toLowerCase().includes("atk") ||
          option.boonTypeString?.toLowerCase().includes("attack") ||
          option.boonTypeString?.toLowerCase().includes("damage");

        if (isAttackUpgrade) {
          score *= 2;
        }

        // Add bonus for high attack values
        score += (option.selectedVal1 + option.selectedVal2) * 0.2;

        return score;
      });
    },
  },

  tank: {
    name: "Tank",
    description: "Prioritize defense and healing",
    evaluateLoot: (lootOptions, state) => {
      return lootOptions.map((option) => {
        let score = option.RARITY_CID || 1;

        // Check if this is a defensive upgrade
        const isDefenseUpgrade =
          option.boonTypeString?.toLowerCase().includes("def") ||
          option.boonTypeString?.toLowerCase().includes("shield") ||
          option.boonTypeString?.toLowerCase().includes("heal") ||
          option.boonTypeString?.toLowerCase().includes("health");

        if (isDefenseUpgrade) {
          score *= 2;
        }

        // Prioritize healing when low on health
        if (
          state.player.health.current <
          state.player.health.currentMax * 0.5
        ) {
          if (option.boonTypeString?.toLowerCase().includes("heal")) {
            score *= 1.5;
          }
        }

        return score;
      });
    },
  },

  twoMoveSpecialist: {
    name: "Two Move Specialist",
    description: "Focus upgrades on only two attack types",
    evaluateLoot: (lootOptions, state) => {
      // Determine which two moves have the most charges/damage already
      const moves = [
        {
          type: "rock",
          damage: state.player.rock.currentATK,
          charges: state.player.rock.currentCharges,
        },
        {
          type: "paper",
          damage: state.player.paper.currentATK,
          charges: state.player.paper.currentCharges,
        },
        {
          type: "scissors",
          damage: state.player.scissor.currentATK,
          charges: state.player.scissor.currentCharges,
        },
      ];

      // Sort by total power (damage * charges)
      moves.sort((a, b) => b.damage * b.charges - a.damage * a.charges);
      const focusMoves = [moves[0].type, moves[1].type];

      return lootOptions.map((option) => {
        let score = option.RARITY_CID || 1;

        // Check if this upgrade benefits our focus moves
        const boonType = option.boonTypeString?.toLowerCase() || "";
        const benefitsFocusMove = focusMoves.some((move) =>
          boonType.includes(move)
        );

        if (benefitsFocusMove) {
          score *= 2.5;
        }

        // Heavily penalize upgrades for the third move
        const benefitsThirdMove = boonType.includes(moves[2].type);
        if (benefitsThirdMove && !benefitsFocusMove) {
          score *= 0.3;
        }

        return score;
      });
    },
  },
};

// Helper function to select the best loot option based on strategy
export function selectBestLoot(
  lootOptions: LootOption[],
  state: GigaverseDungeonState,
  strategyName: keyof typeof lootStrategies = "balanced"
): {
  bestOption: LootOption;
  bestIndex: number;
  scores: number[];
} {
  const strategy = lootStrategies[strategyName];
  const scores = strategy.evaluateLoot(lootOptions, state);

  // Find the index of the highest scoring option
  let bestIndex = 0;
  let bestScore = scores[0];

  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIndex = i;
    }
  }

  return {
    bestOption: lootOptions[bestIndex],
    bestIndex,
    scores,
  };
}

// Function to explain loot choice
export function explainLootChoice(
  chosenOption: LootOption,
  scores: number[],
  strategyName: string
): string {
  const strategy = lootStrategies[strategyName];
  let explanation = `Using ${strategy.name} strategy: ${strategy.description}\n`;

  explanation += `Selected: ${chosenOption.boonTypeString} (Rarity: ${chosenOption.RARITY_CID})\n`;
  explanation += `Values: ${chosenOption.selectedVal1}, ${chosenOption.selectedVal2}`;

  return explanation;
}
