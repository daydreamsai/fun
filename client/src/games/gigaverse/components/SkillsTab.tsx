import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SkillDefinition } from "../client/types/responses";

interface SkillsTabProps {
  state: ContextState<GigaverseContext>;
}

export function SkillsTab({ state }: SkillsTabProps) {
  const { skills, player } = state.options.game;

  const handleUpgrade = async (skillId: number | undefined, statId: number) => {
    if (!skillId) {
      console.error("Skill ID is missing");
      return;
    }

    try {
      const response = await state.options.client.levelUp({
        noobId: parseInt(player.account.noob.docId),
        skillId: skillId,
        statId: statId,
      });

      if (response.success) {
        console.log("✅ Skill upgraded successfully:", response.message);
        // You could trigger a state refresh here or show a toast notification
        // For now, we'll just log the success
      } else {
        console.error(
          "❌ Upgrade failed:",
          response.message || "Unknown error"
        );
      }
    } catch (error) {
      console.error("❌ Error upgrading skill:", error);
    }
  };

  return (
    <div className="">
      {player.skills.entities.map((progress, index) => {
        const skill = skills.entities.find(
          (skill) => parseInt(skill.docId) === progress.SKILL_CID
        )! as SkillDefinition & {
          xpPerLvl?: number[];
          GAME_ITEM_ID_CID?: number;
        };

        // Find the material balance for this skill
        const materialBalance = player.balances.find(
          (balance) => balance.item.id === skill.GAME_ITEM_ID_CID
        );

        return (
          <div key={progress.SKILL_CID} className="">
            {index > 0 && <Separator className="mb-4" />}
            <div className="flex items-center justify-between">
              <div className="truncate">{skill.NAME_CID}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {materialBalance && (
                  <div className="flex items-center gap-1">
                    <span>
                      [{materialBalance.balance} avai.] <br />
                      {skill.xpPerLvl && skill.xpPerLvl[progress.LEVEL_CID + 1]
                        ? `${skill.xpPerLvl[progress.LEVEL_CID + 1]} needed +`
                        : "Max Level"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-muted-foreground">
              Level {progress.LEVEL_CID}
            </div>
            <Separator className="my-2" />
            <div className="mt-2 text-sm">
              {skill.stats.map((stat, i) => {
                const requiredXP = skill.xpPerLvl?.[progress.LEVEL_CID + 1];
                const hasEnoughBalance =
                  materialBalance &&
                  requiredXP &&
                  materialBalance.balance >= requiredXP;
                const isMaxLevel = !requiredXP;

                return (
                  <div
                    className="grid grid-cols-3 items-center justify-start even:mb-2"
                    key={stat.id}
                  >
                    <div className="flex items-center gap-2 ">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          handleUpgrade(skill.GAME_ITEM_ID_CID, stat.id)
                        }
                        disabled={!hasEnoughBalance || isMaxLevel}
                      >
                        +
                      </Button>
                      {stat.name}{" "}
                    </div>
                    <span className="text-muted-foreground">
                      Lv. {progress.LEVEL_CID_array?.[i] ?? 0}
                    </span>
                    {/* <div>{progress.LEVEL_CID_array?.[i] ?? 0}</div> */}
                    <div className="text-right">
                      +
                      {(progress.LEVEL_CID_array?.[i] ?? 0) *
                        stat.increaseValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
