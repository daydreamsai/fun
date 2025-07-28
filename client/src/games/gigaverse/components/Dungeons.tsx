import { Button } from "@/components/ui/button";
import { ContextState } from "@daydreamsai/core";
import {
  GetTodayResponse,
  SkillsProgressEntity,
} from "../client/types/responses";
import { GigaverseContext } from "../context";
import { useAgentStore } from "@/store/agentStore";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Stats } from "./Stats";
import { Weapons } from "./Weapons";
import { GameData, GigaverseDungeonState } from "../client/types/game";

export function Dungeons({
  state,
  today,
  skills,
}: {
  state: ContextState<GigaverseContext>;
  today: GetTodayResponse;
  skills: SkillsProgressEntity[];
}) {
  const { agent } = useAgentStore();
  const navigate = useNavigate({ from: "/games/gigaverse/$chatId" });
  const [loadingDungeons, setLoadingDungeons] = useState<Set<number>>(
    new Set()
  );

  const skillByDungeon: Record<number, number> = {
    1: 1,
    2: 1,
    3: 2,
  };

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-secondary-foreground uppercase text-center bg-secondary">
        Dungeons to run: {state.memory.gamesToPlay}
      </h4>
      <div className="flex flex-col gap-2 text-sm">
        {today.dungeonDataEntities.map((dungeon) => {
          const isCheckpointClear =
            dungeon.CHECKPOINT_CID > 0
              ? state.options.game.player.account.checkpointProgress.find(
                  (checkpoint) => checkpoint.ID_CID
                )?.COMPLETE_CID
              : true;
          return (
            <div key={dungeon.ID_CID} className="border-b pb-2">
              <div className="flex justify-between">
                <div className="font-medium uppercase">{dungeon.NAME_CID}</div>
                <div>Energy: {dungeon.ENERGY_CID}</div>
                <div>
                  Level:{" "}
                  {skills.find(
                    (skill) =>
                      skill.SKILL_CID === skillByDungeon[dungeon.ID_CID]
                  )?.LEVEL_CID ?? 0}
                </div>
              </div>

              <div className="flex gap-2 mt-2 mb-1 justify-between">
                <Button
                  size="sm"
                  className="w-full"
                  variant="secondary"
                  disabled={
                    !isCheckpointClear ||
                    state.options.game.player.energy.entities[0].parsedData
                      .energyValue < dungeon.ENERGY_CID ||
                    loadingDungeons.has(dungeon.ID_CID)
                  }
                  onClick={async () => {
                    // Set loading state
                    setLoadingDungeons((prev) =>
                      new Set(prev).add(dungeon.ID_CID)
                    );

                    // Clear loading state after 2 seconds
                    setTimeout(() => {
                      setLoadingDungeons((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(dungeon.ID_CID);
                        return newSet;
                      });
                    }, 2000);

                    await agent.send({
                      context: state.context,
                      args: state.args,
                      input: {
                        type: "message",
                        data: {
                          user: "player",
                          content:
                            "Lets play 1 game of " +
                            dungeon.NAME_CID +
                            "first add a game to play then start a new run",
                        },
                      },
                    });
                  }}
                >
                  {loadingDungeons.has(dungeon.ID_CID)
                    ? "Dungeon Started"
                    : "Play"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DungeonState({
  state,
  game,
}: {
  state: GigaverseDungeonState;
  game: GameData;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
          Dungeon
        </h5>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <span className="text-sm text-muted-foreground uppercase">
              Room
            </span>
            <div className="text-2xl font-medium">
              {state.currentRoom || "Unknown"}
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground uppercase">
              Enemy
            </span>
            <div className="text-xl font-medium">
              {game.offchain.enemies[state.currentRoom].NAME_CID}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h5 className="text-sm font-medium mb-2 text-secondary-foreground uppercase text-center bg-secondary">
          Last Move Status
        </h5>
        <div className="text-sm">
          {state.lastBattleResult ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Player
                </span>
                <div className="text-lg font-medium uppercase">
                  {state.player.lastMove}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Result
                </span>
                <div className="text-lg font-medium uppercase">
                  {state.lastBattleResult}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground uppercase">
                  Enemy
                </span>
                <div className="text-lg font-medium uppercase">
                  {state.enemy.lastMove}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center">
              No moves yet
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Stats
          title="Player"
          player={state.player}
          colors={{ hp: "bg-primary/80", shield: "bg-primary/80" }}
        />
        <Stats
          title="Enemy"
          player={state.enemy}
          colors={{ hp: "bg-destructive/80", shield: "bg-secondary/80" }}
        />
      </div>
      <Weapons player={state.player} title="Weapons" />
      <Weapons player={state.enemy} title="Enemy Weapons" />
    </div>
  );
}
