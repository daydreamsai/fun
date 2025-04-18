import { context, extension, input, output } from "@daydreamsai/core";
import { z } from "zod";

const chatContext = context({
  type: "chat",
  maxSteps: 100,
  schema: z.object({ chatId: z.string() }),
  key: (args) => args.chatId,
  render() {
    const date = new Date();
    return `\
Current ISO time is: ${date.toISOString()}, timestamp: ${date.getTime()}`;
  },
});

export const chat = extension({
  name: "chat",
  contexts: {
    chat: chatContext,
  },
  inputs: {
    message: input({
      schema: z.object({ user: z.string(), content: z.string() }),
      format({ data }) {
        return {
          tag: "input",
          params: { user: data.user },
          children: data.content,
        };
      },
    }),
  },
  outputs: {
    message: output({
      schema: z.string(),
      required: true,
      examples: [`<output type="message">Hi!</output>`],
    }),
  },
  actions: [],
});
