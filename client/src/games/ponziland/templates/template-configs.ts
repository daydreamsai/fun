import { Template } from "@/store/templateStore";
import { gameDocsTemplate } from "./game-docs";
import { contextTemplate } from "./context-template";
import { gameRulesTemplate } from "./game-rules";

export const defaultSections: Record<
  string,
  { label: string; default: Template }
> = {
  rules: {
    label: "Rules",
    default: {
      id: "ponziland-rules-default",
      title: "Default Rules",
      section: "rules",
      tags: ["default", "core"],
      prompt: gameRulesTemplate,
      isDefault: true,
    },
  },
  instructions: {
    label: "Instructions",
    default: {
      id: "ponziland-instructions-default",
      title: "Default Instructions",
      section: "instructions",
      tags: ["default", "strategy"],
      prompt: gameDocsTemplate,
      isDefault: true,
    },
  },
};
