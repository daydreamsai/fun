import { HelpCircle, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialTemplate: string;
  requiredVariables?: string[];
  onApplyTemplate: (newTemplate: string) => void;
  onResetTemplate?: () => void;
}

// Regex to find {{variable}} patterns
const VARIABLE_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

export function TemplateEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  initialTemplate,
  requiredVariables = [],
  onApplyTemplate,
  onResetTemplate,
}: TemplateEditorDialogProps) {
  const [editText, setEditText] = useState<string>(initialTemplate);
  const [invalidVariables, setInvalidVariables] = useState<string[]>([]);

  // Update local state if the initial template changes from props
  useEffect(() => {
    setEditText(initialTemplate);
  }, [initialTemplate]);

  // Validate template whenever editText or requiredVariables change
  useEffect(() => {
    const allowedVariableSet = new Set(requiredVariables);
    const foundVariables: string[] = [];
    let match;

    // Reset regex state before each use
    VARIABLE_REGEX.lastIndex = 0;

    while ((match = VARIABLE_REGEX.exec(editText)) !== null) {
      foundVariables.push(match[1]); // Capture group 1 is the variable name
    }

    // Find variables present in the text but not in the allowed list
    const invalid = foundVariables.filter(
      (variable) => !allowedVariableSet.has(variable)
    );

    // Only set if requiredVariables are provided. If not, allow anything.
    if (requiredVariables.length > 0) {
      setInvalidVariables(invalid);
    } else {
      setInvalidVariables([]); // No restrictions if no requiredVariables list is given
    }
  }, [editText, requiredVariables]);

  const handleApply = () => {
    if (invalidVariables.length > 0) {
      toast.error(
        "Template contains invalid variables not in the allowed list.",
        {
          description: `Invalid: ${invalidVariables
            .map((v) => `{{${v}}}`)
            .join(", ")}`,
        }
      );
      return; // Prevent applying if variables are invalid
    }
    onApplyTemplate(editText);
    toast.success(`${title} template applied.`);
    onOpenChange(false); // Close dialog on apply
  };

  const handleReset = () => {
    if (onResetTemplate) {
      onResetTemplate();
      toast.info(`${title} template reset.`);
    }
  };

  const hasAllowedVariablesList =
    requiredVariables && requiredVariables.length > 0;
  const isValid = invalidVariables.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto py-4 pr-2">
          <div className="md:col-span-2 flex flex-col h-full">
            <label
              htmlFor="template-textarea"
              className="text-sm font-medium mb-1"
            >
              Template Content
            </label>
            <Textarea
              id="template-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={15}
              className="font-mono text-sm h-full resize-none flex-grow"
              placeholder={`Enter ${title.toLowerCase()} template here... Use {{variable}} format.`}
            />
          </div>

          {hasAllowedVariablesList && (
            <div className="flex flex-col h-full">
              <label className="text-sm font-medium mb-1">
                Allowed Variables
              </label>
              <ScrollArea className="border rounded-md p-3 bg-muted/40 h-full">
                <p className="text-xs text-muted-foreground mb-2">
                  Only variables from this list can be used in the template
                  (using <code>{"{{variable}}"}</code> format).
                </p>
                <div className="flex flex-wrap gap-1">
                  {requiredVariables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="font-mono text-xs"
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {!isValid && (
          <Alert variant="destructive" className="mt-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Variables Found</AlertTitle>
            <AlertDescription className="text-xs">
              The template uses variables not in the allowed list:{" "}
              {invalidVariables.map((v: string) => `{{${v}}}`).join(", ")}.
              Please remove or correct them.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex sm:justify-end items-center gap-2 pt-4 border-t mt-2">
          <div className="flex-grow">
            {onResetTemplate && (
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="mr-1 h-4 w-4" /> Reset to Default
              </Button>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={handleApply} size="sm" disabled={!isValid}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
