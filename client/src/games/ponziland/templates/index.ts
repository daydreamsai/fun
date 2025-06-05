import { contextTemplate } from "./context-template";
import { gameDocsTemplate } from "./game-docs";
import { gameRulesTemplate } from "./game-rules";
import { gameInstructionsTemplate } from "./game-instructions";
import { ponzilandVariables } from "./variables";
import { defaultSections } from "./template-configs";

export const templates = {
  context: contextTemplate,
  docs: gameDocsTemplate,
  rules: gameRulesTemplate,
  variables: ponzilandVariables,
  instructions: gameInstructionsTemplate,
  defaultSections,
};

// Named exports for individual templates
export { contextTemplate } from "./context-template";
export { gameDocsTemplate } from "./game-docs";
export { gameRulesTemplate } from "./game-rules";
export { gameInstructionsTemplate } from "./game-instructions";
export { ponzilandVariables } from "./variables";
export { defaultSections } from "./template-configs";

export default templates;
