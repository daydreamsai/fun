import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Template = {
  id: string;
  title: string;
  tags: string[];
  section: string;
  prompt: string;
};

interface TemplateState {
  templates: Record<string, Template[]>;

  selected: Record<string, Record<string, string>>;

  createTemplate: (key: string, template: Template) => void;
  updateTemplate: (key: string, template: Template) => void;
  deleteTemplate: (key: string, templateId: string) => void;

  selectTemplate: (key: string, section: string, templateId: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: {},
      selected: {},
      selectTemplate: (key, section, templateId) =>
        set(({ selected }) => {
          if (!selected[key]) {
            selected[key] = {};
          }
          selected[key][section] = templateId;
          return { selected };
        }),
      createTemplate: (contextType, template) =>
        set(({ templates }) => {
          if (templates[contextType] === undefined) {
            templates[contextType] = [];
          }
          templates[contextType].push(template);
          return {
            templates,
          };
        }),
      updateTemplate: (contextType, template) =>
        set(({ templates }) => {
          const current = templates[contextType].find(
            (t) => t.id === template.id
          );

          if (current) Object.assign(current, template);

          return {
            templates,
          };
        }),
      deleteTemplate: (key, id) =>
        set(({ templates }) => {
          templates[key] = templates[key].filter((t) => t.id !== id);
          return {
            templates,
          };
        }),
    }),
    {
      name: "agent-template-storage",
      version: 6,
    }
  )
);
