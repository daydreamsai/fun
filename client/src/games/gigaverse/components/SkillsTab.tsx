import { ContextState } from "@daydreamsai/core";
import { GigaverseContext } from "../context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillDefinition } from "../client/types/responses";
import { useState } from "react";

interface SkillsTabProps {
  state: ContextState<GigaverseContext>;
}

export function SkillsTab({ state }: SkillsTabProps) {
  const { skills, player } = state.options.game;
  const [activeSkillTab, setActiveSkillTab] = useState("dungeon");

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
      } else {
        console.error("❌ Upgrade failed:", response.message || "Unknown error");
      }
    } catch (error) {
      console.error("❌ Error upgrading skill:", error);
    }
  };

  // Separate skills by type
  const dungeonSkills = player.skills.entities.filter((progress) => {
    const skill = skills.entities.find(
      (skill) => parseInt(skill.docId) === progress.SKILL_CID
    );
    return skill && !skill.NAME_CID.toLowerCase().includes("fishing");
  });

  const fishingSkills = player.skills.entities.filter((progress) => {
    const skill = skills.entities.find(
      (skill) => parseInt(skill.docId) === progress.SKILL_CID
    );
    return skill && skill.NAME_CID.toLowerCase().includes("fishing");
  });

  const renderSkills = (skillsToRender: typeof player.skills.entities) => (
    <div className="grid grid-cols-2 gap-4">
      {skillsToRender.map((progress) => {
        const skill = skills.entities.find(
          (skill) => parseInt(skill.docId) === progress.SKILL_CID
        )! as SkillDefinition & {
          xpPerLvl?: number[];
          GAME_ITEM_ID_CID?: number;
        };

        const materialBalance = player.balances.find(
          (balance) => balance.item.id === skill.GAME_ITEM_ID_CID
        );

        return (
          <div key={progress.SKILL_CID} className="bg-card p-3 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold truncate">{skill.NAME_CID}</h4>
              <div className="text-xs bg-primary/10 px-2 py-1 rounded">
                Level {progress.LEVEL_CID}
              </div>
            </div>
            
            {materialBalance && (
              <div className="text-xs text-muted-foreground mb-2">
                Material: {materialBalance.balance} available
                {skill.xpPerLvl && skill.xpPerLvl[progress.LEVEL_CID + 1] ? (
                  <span className="block">Need: {skill.xpPerLvl[progress.LEVEL_CID + 1]}</span>
                ) : (
                  <span className="block text-green-600">Max level reached</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {skill.stats.map((stat, i) => {
                const requiredXP = skill.xpPerLvl?.[progress.LEVEL_CID + 1];
                const hasEnoughBalance =
                  materialBalance &&
                  requiredXP &&
                  materialBalance.balance >= requiredXP;
                const isMaxLevel = !requiredXP;

                return (
                  <div key={stat.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={hasEnoughBalance && !isMaxLevel ? "default" : "outline"}
                        className="h-6 w-6 p-0 text-xs"
                        onClick={() =>
                          handleUpgrade(skill.GAME_ITEM_ID_CID, stat.id)
                        }
                        disabled={!hasEnoughBalance || isMaxLevel}
                      >
                        +
                      </Button>
                      <span className="text-sm">{stat.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lv. {progress.LEVEL_CID_array?.[i] ?? 0} (+{(progress.LEVEL_CID_array?.[i] ?? 0) * stat.increaseValue})
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

  return (
    <Tabs value={activeSkillTab} onValueChange={setActiveSkillTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dungeon">Dungeon</TabsTrigger>
        <TabsTrigger value="fishing">Fishing</TabsTrigger>
      </TabsList>
      
      <TabsContent value="dungeon" className="mt-4">
        {renderSkills(dungeonSkills)}
      </TabsContent>
      
      <TabsContent value="fishing" className="mt-4">
        {renderSkills(fishingSkills)}
      </TabsContent>
    </Tabs>
  );
}
