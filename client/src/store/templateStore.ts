import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TemplateState {
  templates: Record<string, string>;
  setTemplate: (key: string, newTemplate: string) => void;
  resetTemplate: (key: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: {},
      setTemplate: (key, template) =>
        set(({ templates }) => {
          templates[key] = template;
          return {
            templates,
          };
        }),
      resetTemplate: (key) =>
        set(({ templates }) => {
          delete templates[key];
          return {
            templates,
          };
        }),
    }),
    {
      name: "agent-template-storage",
      version: 2,
    }
  )
);
