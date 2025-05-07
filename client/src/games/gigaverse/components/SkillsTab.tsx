import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";

interface SkillsTabProps {
  state: ContextState<GigaverseContext>;
}

export function SkillsTab({ state }: SkillsTabProps) {
  const { skills, player } = state.options.game;

  return (
    <div className="">
      {player.skills.entities.map((progress) => {
        const skill = skills.entities.find(
          (skill) => parseInt(skill.docId) === progress.SKILL_CID
        )!;

        return (
          <div key={progress.SKILL_CID} className="">
            <div className="truncate">{skill.NAME_CID}</div>
            <div className="text-muted-foreground">
              Level {progress.LEVEL_CID}
            </div>
            <div className="mt-2 text-sm">
              {skill.stats.map((stat, i) => (
                <div className="grid grid-cols-3 items-baseline justify-between even:mb-2">
                  <div>{stat.name} </div>
                  <span className="text-muted-foreground">
                    Lv. {progress.LEVEL_CID_array?.[i] ?? 0}
                  </span>
                  {/* <div>{progress.LEVEL_CID_array?.[i] ?? 0}</div> */}
                  <div className="text-right">
                    +{(progress.LEVEL_CID_array?.[i] ?? 0) * stat.increaseValue}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
