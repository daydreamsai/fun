import { AlertCircle, ScrollText, Plus, Trash, Edit } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Template, useTemplateStore } from "@/store/templateStore";

import { randomUUIDv7 } from "@daydreamsai/core";

// import { lightTheme } from "@uiw/react-json-view/";
interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variables?: string[];
  templateKey: string;
  sections?: Record<string, { label: string; default: Template }>;
}

// Regex to find {{variable}} patterns
const VARIABLE_REGEX = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;

type State =
  | { page: "index" }
  | { page: "create"; section: string }
  | { page: "edit"; id: string };

export function TemplateEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  variables = [],
  sections = {},
  templateKey,
}: TemplateEditorDialogProps) {
  const [state, setState] = useState<State>({ page: "index" });

  const {
    selected,
    templates: store,
    selectTemplate,
    createTemplate,
    updateTemplate,
  } = useTemplateStore();

  const templates = store[templateKey]?.slice() ?? [];

  useEffect(() => {
    if (store[templateKey] === undefined || store[templateKey].length === 0) {
      for (const section of Object.values(sections)) {
        createTemplate(templateKey, section.default);
        selectTemplate(
          templateKey,
          section.default.section,
          section.default.id
        );
      }
    }
  }, [store]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl h-full max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {state.page === "index" && (
          <>
            <div className="grow flex flex-col items-start gap-4 overflow-y-scroll pb-4">
              {Object.keys(sections).map((section) => (
                <div key={section} className="w-full pr-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>{sections[section].label}</div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setState({ page: "create", section });
                      }}
                    >
                      Create
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templates
                      .filter((template) => template.section === section)
                      .map((template) => {
                        const isSelected =
                          selected[templateKey] &&
                          selected[templateKey][section] === template.id;

                        return (
                          <TemplateCard
                            template={template}
                            isSelected={isSelected}
                            onEdit={() => {
                              setState({ page: "edit", id: template.id });
                            }}
                            onSelect={() => {
                              selectTemplate(templateKey, section, template.id);
                            }}
                          />
                        );
                      })}
                    <div
                      className={cn(
                        "md:aspect-square border p-4 rounded flex flex-col hover:border-white/50 items-center justify-center",
                        "border-border font-medium text-center border-dashed gap-y-2 text-muted-foreground",
                        "cursor-pointer hover:text-white"
                      )}
                      onClick={() => {
                        setState({ page: "create", section });
                      }}
                    >
                      <Plus></Plus>
                      <div>
                        Create New <br /> {sections[section].label}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {state.page === "edit" && (
          <TemplateForm
            initialTemplate={
              templates.find((template) => template.id === state.id)!
            }
            variables={variables}
            onCancel={() => {
              setState({ page: "index" });
            }}
            onSave={(template) => {
              setState({ page: "index" });
              updateTemplate(templateKey, template);
            }}
          />
        )}

        {state.page === "create" && (
          <TemplateForm
            initialTemplate={{
              id: randomUUIDv7(),
              section: state.section,
              title: "",
              prompt: "",
              tags: [],
            }}
            variables={variables}
            onCancel={() => {
              setState({ page: "index" });
            }}
            onSave={(template) => {
              setState({ page: "index" });
              createTemplate(templateKey, template);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onEdit,
}: {
  template: Template;
  isSelected: boolean;
  onEdit: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      key={template.id}
      className={cn(
        "md:aspect-square border p-4 rounded flex flex-col hover:border-primary/50",
        isSelected ? "border-primary" : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-lg">{template.title}</div>
        <div className="flex gap-1">{isSelected && <Badge>active</Badge>}</div>
      </div>
      <div className="mt-2">{template.prompt.slice(0, 150)}...</div>
      <div className="flex mt-4 gap-2">
        {template.tags.map((tag, i) => (
          <Badge variant="secondary" key={i}>
            {tag.trim()}
          </Badge>
        ))}
      </div>
      <div className="mt-4 md:mt-auto flex">
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => {}}
        >
          <Trash />
        </Button>
        <Button
          variant="ghost"
          className="ml-auto mr-2 text-muted-foreground"
          onClick={onEdit}
        >
          Edit
        </Button>

        <Button
          variant={isSelected ? "ghost" : "secondary"}
          disabled={isSelected}
          onClick={onSelect}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
}

function TemplateForm({
  initialTemplate,
  variables = [],
  onCancel,
  onSave,
}: {
  variables: string[];
  initialTemplate: Template;
  onCancel: () => void;
  onSave: (template: Template) => void;
}) {
  const [editText, setEditText] = useState<string>(initialTemplate.prompt);
  const [invalidVariables, setInvalidVariables] = useState<string[]>([]);
  const editTextDeferred = useDeferredValue(editText);
  const hasAllowedVariablesList = variables && variables.length > 0;
  const isValid = invalidVariables.length === 0;

  // Validate template whenever editText or variables change
  useEffect(() => {
    const allowedVariableSet = new Set(variables);
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

    // Only set if variables are provided. If not, allow anything.
    if (variables.length > 0) {
      setInvalidVariables(invalid);
    } else {
      setInvalidVariables([]); // No restrictions if no variables list is given
    }
  }, [editTextDeferred, variables]);

  return (
    <>
      <form
        id={`template-form:${initialTemplate.id}`}
        className="flex flex-col flex-grow overflow-y-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          const { title, prompt, tags } = Object.fromEntries(
            new FormData(e.currentTarget).entries()
          ) as { title: string; prompt: string; tags: string };

          const newTemplate: Template = {
            ...initialTemplate,
            title,
            prompt,
            tags: tags.split(","),
          };

          onSave(newTemplate);

          e.currentTarget.reset();
        }}
      >
        <div className="pl-1 flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 py-4 pr-2 overflow-y-hidden">
          <div className="md:col-span-2 flex flex-col h-full gap-3">
            <div className="flex gap-2">
              <div className="flex flex-col gap-2 grow">
                <Label htmlFor="template-title">Title</Label>
                <Input
                  id="template-title"
                  name="title"
                  defaultValue={initialTemplate.title}
                ></Input>
              </div>
              <div className="flex flex-col gap-2 w-4/12">
                <Label htmlFor="template-tags">Tags</Label>
                <Input
                  id="template-tags"
                  name="tags"
                  defaultValue={initialTemplate.tags.join(", ")}
                ></Input>
              </div>
            </div>
            <div className="flex flex-col grow gap-2">
              <Label htmlFor="template-textarea">Prompt</Label>
              <Textarea
                id="template-textarea"
                name="prompt"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={15}
                className="font-mono text-sm h-full resize-none flex-grow"
                placeholder={`Enter template here... Use {{variable}} format.`}
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
                  {variables.map((variable) => (
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
      </form>
      {!isValid && (
        <Alert variant="destructive" className="mt-2 mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Variables Found</AlertTitle>
          <AlertDescription className="text-xs">
            The template uses variables not in the allowed list:{" "}
            {invalidVariables.map((v: string) => `{{${v}}}`).join(", ")}. Please
            remove or correct them.
          </AlertDescription>
        </Alert>
      )}
      <DialogFooter className="ml-1 shrink-0 flex sm:justify-normal sm:items-center gap-2 pt-4 border-t">
        <Button onClick={() => onCancel()} variant="ghost" className="mr-auto">
          Cancel
        </Button>

        <Button
          onClick={() => {}}
          disabled={!isValid}
          type="submit"
          form={`template-form:${initialTemplate.id}`}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
