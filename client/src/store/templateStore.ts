import { template } from "@/agent/giga";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TemplateState {
  template: string;
  setTemplate: (newTemplate: string) => void;
  resetTemplate: () => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      template: template, // Initialize with the local default template
      setTemplate: (newTemplate) => set({ template: newTemplate }),
      resetTemplate: () => set({ template: template }), // Use local default template
    }),
    {
      name: "agent-template-storage", // Persist template in local storage
    }
  )
);
