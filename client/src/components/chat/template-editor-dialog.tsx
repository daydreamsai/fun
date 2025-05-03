import { HelpCircle, AlertCircle, RotateCcw, ScrollText } from "lucide-react";
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
import { useState, useEffect, useDeferredValue } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

// import { lightTheme } from "@uiw/react-json-view/";
interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialTemplate: string;
  requiredVariables?: string[];
  onApplyTemplate: (newTemplate: string) => void;
  onResetTemplate?: () => void;
  templateKey: string;
  sections?: Record<string, { label: string; default?: string }>;
}

// Regex to find {{variable}} patterns
const VARIABLE_REGEX = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;

export function TemplateEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  initialTemplate,
  requiredVariables = [],
  onApplyTemplate,
  onResetTemplate,
  sections = {},
  templateKey,
}: TemplateEditorDialogProps) {
  const [editText, setEditText] = useState<string>(initialTemplate);
  const [invalidVariables, setInvalidVariables] = useState<string[]>([]);

  const [selectedTempalte, selectTemplate] = useState(0);

  const [templateEditing, selectTemplateEditing] = useState<undefined | string>(
    undefined
  );

  const editTextDeferred = useDeferredValue(editText);

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
  }, [editTextDeferred, requiredVariables]);

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
    }
    toast.info(`${title} template reset.`);
  };

  const hasAllowedVariablesList =
    requiredVariables && requiredVariables.length > 0;
  const isValid = invalidVariables.length === 0;

  useEffect(() => {
    selectTemplateEditing(undefined);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl h-full max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {templateEditing === undefined ? (
          <div className="grow flex flex-col items-start gap-4 overflow-y-scroll pb-4">
            {Object.keys(sections).map((key) => (
              <div key={key} className="w-full pr-4">
                <div className="flex items-center justify-between mb-4">
                  <div>{sections[key].label}</div>
                  <Button variant="outline">Create</Button>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "md:aspect-square border p-4 rounded flex flex-col hover:border-primary/50",
                        selectedTempalte === i
                          ? "border-primary"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-lg">Template {i}</div>
                        <div className="flex gap-1">
                          {selectedTempalte === i && <Badge>active</Badge>}
                        </div>
                      </div>
                      <div className="mt-2">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        Praesent scelerisque nisl a elit dignissim iaculis. In
                        nec lacinia orci.
                      </div>
                      <div className="flex mt-2 gap-2">
                        <Badge variant="secondary">Aggresive</Badge>
                        <Badge variant="secondary">Testing</Badge>
                      </div>
                      <div className="mt-4 md:mt-auto flex justify-between">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            selectTemplateEditing("1");
                          }}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="secondary"
                          disabled={selectedTempalte === i}
                        >
                          {selectedTempalte === i ? "Selected" : "Select"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col flex-grow overflow-y-hidden">
            <div className="pl-1 flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 py-4 pr-2 overflow-y-hidden">
              <div className="md:col-span-2 flex flex-col h-full gap-3">
                <div className="flex gap-2">
                  <div className="flex flex-col gap-2 grow">
                    <Label htmlFor="template-textarea">Title</Label>
                    <Input></Input>
                  </div>
                  <div className="flex flex-col gap-2 w-4/12">
                    <Label htmlFor="template-textarea">Tags</Label>
                    <Input></Input>
                  </div>
                </div>
                <div className="flex flex-col grow gap-2">
                  <Label htmlFor="template-textarea">Prompt</Label>
                  <Textarea
                    id="template-textarea"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={15}
                    className="font-mono text-sm h-full resize-none flex-grow"
                    placeholder={`Enter ${title.toLowerCase()} template here... Use {{variable}} format.`}
                  />
                </div>
              </div>
              {hasAllowedVariablesList && (
                <div className="flex flex-col overflow-y-hidden">
                  <Label className="mb-2">Allowed Variables</Label>
                  <div className="border rounded-md p-3 flex-1 overflow-y-scroll pb-8">
                    {/* <JsonView value={example} style={lightTheme} /> */}
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
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

        <DialogFooter className="ml-1 shrink-0 flex sm:justify-normal sm:items-center gap-2 pt-4 border-t">
          {onResetTemplate && (
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="border-0 sm:border mr-auto"
            >
              <RotateCcw className="mr-1" /> Reset to Defaults
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={handleApply} size="sm" disabled={!isValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
