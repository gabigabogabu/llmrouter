// use `bun test --rerun-each 100` to rerun each test 100 times

import { test, describe, expect, beforeAll } from "bun:test";
import dotenv from "dotenv";
import fs from "fs";
import type OpenAI from "openai";

import { LlmRouter } from "../../index";
import path from "path";

const fuzztestReport = {
  "model": "gpt-4o-mini-search-preview@openai",
  "error": {
    "message": "400 Model incompatible request argument supplied: presence_penalty",
    "status": 400,
    "headers": "<redacted>",
    "request_id": "<redacted>",
    "error": {
      "message": "Model incompatible request argument supplied: presence_penalty",
      "type": "invalid_request_error",
      "param": null,
      "code": null
    },
    "code": null,
    "param": null,
    "type": "invalid_request_error",
    "line": 1,
    "column": 28,
    "stack": "Error: 400 Model incompatible request argument supplied: presence_penalty\n    at new OpenAIError (unknown:1:28)\n    at new APIError (./llmrouter/node_modules/openai/error.mjs:7:9)\n    at new BadRequestError (unknown:1:28)\n    at generate (./llmrouter/node_modules/openai/error.mjs:41:24)\n    at <anonymous> (./llmrouter/node_modules/openai/core.mjs:339:30)"
  },
  "requestParams": {
    "model": "gpt-4o-mini-search-preview",
    "messages": [
      {
        "role": "system" as const,
        "content": "You are an expert in science and technology."
      },
      {
        "role": "user" as const,
        "content": "What are the planets in our solar system?"
      },
      {
        "role": "assistant" as const,
        "content": "That's an interesting question. Let me think about that."
      }
    ],
    "stream": false,
    "presence_penalty": 0
  },
  "response": null
}

dotenv.config({ path: path.join(__dirname, "../../.env.test.local") });

describe("gpt_4o_mini_search_preview_openai_1748635907306", () => {
  let router: LlmRouter;

  beforeAll(async () => {
    router = new LlmRouter({ openaiApiKey: process.env.OPENAI_API_KEY });
  });

  test('should omit presence_penalty', async () => {
    fuzztestReport.requestParams.model = fuzztestReport.model;
    const response = await router.chat(fuzztestReport.requestParams) as OpenAI.Chat.Completions.ChatCompletion;
    expect(response).toBeDefined();
    expect(response.choices).toBeInstanceOf(Array);
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0]?.message).toBeDefined();
    expect(response.choices[0]?.message?.content).toBeDefined();
  }, { timeout: 10000 });
});
