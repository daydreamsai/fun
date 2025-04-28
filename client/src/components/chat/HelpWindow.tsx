import { HelpCircle, Command, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpWindow({ open, onOpenChange }: HelpWindowProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Welcome to Gigaverse!
          </DialogTitle>
          <DialogDescription>
            Get started with your automated dungeon adventures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Command className="h-5 w-5 text-primary" />
              Getting Started
            </h3>
            <div className="text-sm space-y-2">
              <p>
                Gigaverse is an AI-powered game that automates your dungeon
                runs.
              </p>
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">Quick Start:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Just say "hey start playing and don't stop" to begin</li>
                  <li>
                    The AI agent will automatically run your dungeon adventures
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Troubleshooting
            </h3>
            <div className="text-sm space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  If the agent is saying it can't continue but you are in the
                  middle of a run, just tell it "You must use rock the next
                  move, you have enough energy"
                </li>
                <li>
                  <strong>Constant 400 errors</strong> - check your energy
                  levels
                </li>
                <li>
                  Try refreshing the page if the game becomes unresponsive
                </li>
                <li>
                  The agent remembers actions, if you have been going for a long
                  time - reseting sometimes helps.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center">
          <label className="flex items-center space-x-2 text-sm">
            <Switch
              id="dont-show-again"
              onCheckedChange={(checked) => {
                if (!checked) return; // Only handle checking the box
                onOpenChange(false);
              }}
            />
            <span>Don't show this again</span>
          </label>
          <Button
            onClick={() => onOpenChange(false)}
            className="sm:w-auto w-full mt-2 sm:mt-0"
          >
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
