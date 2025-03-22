import {
  context,
  extension,
  formatMsg,
  input,
  output,
} from "@daydreamsai/core";
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
      format(params) {
        return formatMsg({
          role: "user",
          user: params.user,
          content: params.content,
        });
      },
    }),
  },
  outputs: {
    message: output({
      schema: z.object({
        user: z.string().describe("the user you are replying to"),
        content: z.string(),
      }),
      handler(_params, _ctx, _agent) {
        return {
          data: _params,
          timestamp: Date.now(),
        };
      },
      required: true,
    }),
  },
  actions: [],
});
