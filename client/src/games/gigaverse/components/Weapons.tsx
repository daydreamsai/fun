import { Player } from "../client/types/game";

export function Weapons({ title, player }: { title: string; player: Player }) {
  return (
    <div>
      <h5 className="text-sm font-medium mb-2 uppercase text-center text-secondary-foreground bg-secondary">
        {title}
      </h5>
      <div className="grid grid-cols-3 gap-2">
        <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
          <div className="font-medium">⚔️ x {player.rock.currentCharges}</div>
          <div className="text-sm mt-1 space-y-0.5 w-full">
            <div className="flex justify-between">
              <span>ATK:</span>
              <span>{player.rock.currentATK}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF:</span>
              <span>{player.rock.currentDEF}</span>
            </div>
          </div>
        </div>
        <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
          <div className="font-medium">🛡️ x {player.paper.currentCharges}</div>
          <div className="text-sm mt-1 space-y-0.5 w-full">
            <div className="flex justify-between">
              <span>ATK:</span>
              <span>{player.paper.currentATK}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF:</span>
              <span>{player.paper.currentDEF}</span>
            </div>
          </div>
        </div>
        <div className="border-2 border-secondary rounded-md p-2 flex flex-col items-center">
          <div className="font-medium">
            ✨ x {player.scissor.currentCharges}
          </div>
          <div className="text-sm mt-1 space-y-0.5 w-full">
            <div className="flex justify-between">
              <span>ATK:</span>
              <span>{player.scissor.currentATK}</span>
            </div>
            <div className="flex justify-between">
              <span>DEF:</span>
              <span>{player.scissor.currentDEF}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
