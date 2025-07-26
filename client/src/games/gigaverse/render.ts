import { jsonPath } from "@/lib/jsonPath";
import { formatValue, formatXml, XMLElement } from "@daydreamsai/core";

export function render<Template extends string>(str: Template, data: any) {
  return str
    .trim()
    .replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_match, key: string) => {
      const res = jsonPath(data, key);
      if (!res) return "";
      const [value] = res;
      if (typeof value === "object") {
        if (value && "tag" in value) return formatXml(value as XMLElement);
        if (value) return formatValue(value);
      }

      if (Array.isArray(value)) {
        return value
          .map((v) => {
            if (typeof v === "object" && v && "tag" in v) {
              return formatXml(v);
            }
            return formatValue(v);
          })
          .join("\n");
      }

      return value ?? "";
    });
}
