import { AlertCircle, ScrollText, Plus, Trash, Copy } from "lucide-react";
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
import React, { useState, useEffect, useDeferredValue } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { Template, useTemplateStore } from "@/store/templateStore";

import { randomUUIDv7 } from "@daydreamsai/core";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

// import { lightTheme } from "@uiw/react-json-view/";
interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variables?: string[];
  templateKey: string;
  sections?: Record<string, { label: string; default: Template }>;
  setSelected?: (key: string, section: string, templateId: string) => void;
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
  setSelected,
}: TemplateEditorDialogProps) {
  const [state, setState] = useState<State>({ page: "index" });

  const {
    selected,
    templates: store,
    selectTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplateStore();

  const templates = store[templateKey]?.slice() ?? [];

  // Combine defaults with user templates
  const allTemplates = React.useMemo(() => {
    const userTemplates = templates.filter(
      (t) => !Object.values(sections).some((s) => s.default.id === t.id)
    );
    const defaults = Object.values(sections).map((s) => s.default);
    return [...defaults, ...userTemplates];
  }, [templates, sections]);

  // Fork a template to create a user copy
  const forkTemplate = (template: Template) => {
    const forkedTemplate: Template = {
      ...template,
      id: randomUUIDv7(),
      title: `${template.title} (Copy)`,
      tags: [...template.tags, "forked"],
    };
    createTemplate(templateKey, forkedTemplate);
    if (setSelected) {
      setSelected(templateKey, template.section, forkedTemplate.id);
    } else {
      selectTemplate(templateKey, template.section, forkedTemplate.id);
    }
    setState({ page: "edit", id: forkedTemplate.id });
  };

  useEffect(() => {
    // Ensure default is selected if nothing is selected
    for (const [section, config] of Object.entries(sections)) {
      if (!selected[templateKey]?.[section]) {
        if (setSelected) {
          setSelected(templateKey, section, config.default.id);
        } else {
          selectTemplate(templateKey, section, config.default.id);
        }
      }
    }
  }, [selected, templateKey, sections, selectTemplate, setSelected]);

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
                    {allTemplates
                      .filter((template) => template.section === section)
                      .map((template) => {
                        const isSelected =
                          selected[templateKey] &&
                          selected[templateKey][section] === template.id;
                        const isDefault =
                          sections[section].default.id === template.id;
                        return (
                          <TemplateCard
                            key={template.id}
                            template={template}
                            isSelected={isSelected}
                            isDefault={isDefault}
                            onEdit={() => {
                              if (isDefault) {
                                forkTemplate(template);
                              } else {
                                setState({ page: "edit", id: template.id });
                              }
                            }}
                            onFork={() => forkTemplate(template)}
                            onDelete={() => {
                              if (!isDefault) {
                                deleteTemplate(templateKey, template.id);
                              }
                            }}
                            onSelect={() => {
                              if (setSelected) {
                                setSelected(templateKey, section, template.id);
                              } else {
                                selectTemplate(
                                  templateKey,
                                  section,
                                  template.id
                                );
                              }
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
              allTemplates.find((template) => template.id === state.id)!
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
  onDelete,
  onFork,
  isDefault,
}: {
  template: Template;
  isSelected: boolean;
  onEdit: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onFork: () => void;
  isDefault: boolean;
}) {
  return (
    <Card
      key={template.id}
      className={cn(
        "md:aspect-square rounded flex flex-col",
        isSelected ? "border-primary" : "border-border"
      )}
    >
      <CardHeader className="p-4">
        <CardTitle>{template.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p>{template.prompt.slice(0, 150)} ...</p>
        <div className="mt-2">
          {template.tags
            .filter((t) => !!t.trim())
            .map((tag, i) => (
              <Badge variant="secondary" key={i} className="rounded">
                {tag.trim()}
              </Badge>
            ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 mt-4 md:mt-auto flex">
        {isDefault ? (
          <>
            <div className="text-xs text-muted-foreground">Default</div>
            <Button
              variant="ghost"
              className="ml-auto mr-2 text-muted-foreground"
              onClick={onFork}
            >
              <Copy className="h-4 w-4 mr-1" />
              Fork
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              className="text-muted-foreground"
              disabled={isSelected}
              onClick={onDelete}
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
          </>
        )}

        <Button variant="default" disabled={isSelected} onClick={onSelect}>
          {isSelected ? "Selected" : "Select"}
        </Button>
      </CardFooter>
    </Card>
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
