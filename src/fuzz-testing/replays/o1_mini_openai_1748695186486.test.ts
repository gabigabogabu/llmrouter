import { test, describe, expect, beforeAll } from "bun:test";
import dotenv from "dotenv";
import type OpenAI from "openai";

import { LlmRouter } from "../../index";
import path from "path";

const fuzztestReport = {
  "model": "o1-mini@openai",
  "error": {
    "message": "400 Unsupported value: 'messages[0].role' does not support 'system' with this model.",
    "status": 400,
    "headers": "<redacted>",
    "request_id": "<redacted>",
    "error": {
      "message": "Unsupported value: 'messages[0].role' does not support 'system' with this model.",
      "type": "invalid_request_error",
      "param": "messages[0].role",
      "code": "unsupported_value"
    },
    "code": "unsupported_value",
    "param": "messages[0].role",
    "type": "invalid_request_error",
    "line": 1,
    "column": 28,
    "stack": "Error: 400 Unsupported value: 'messages[0].role' does not support 'system' with this model.\n    at new OpenAIError (unknown:1:28)\n    at new APIError (./llmrouter/node_modules/openai/error.mjs:7:9)\n    at new BadRequestError (unknown:1:28)\n    at generate (./llmrouter/node_modules/openai/error.mjs:41:24)\n    at <anonymous> (./llmrouter/node_modules/openai/core.mjs:339:30)"
  },
  "requestParams": {
    "model": "o1-mini",
    "messages": [
      {
        "role": "system" as const,
        "content": "You are a friendly chatbot."
      },
      {
        "role": "user" as const,
        "content": "What is the difference between HTTP and HTTPS?"
      }
    ],
    "stream": false,
    "temperature": 2
  },
  "response": null
}

const otherFuzztestReport = {
  "model": "o1-mini@openai",
  "error": {
    "message": "400 Unsupported value: 'temperature' does not support 2 with this model. Only the default (1) value is supported.",
    "status": 400,
    "headers": "<redacted>",
    "request_id": "<redacted>",
    "error": {
      "message": "Unsupported value: 'temperature' does not support 2 with this model. Only the default (1) value is supported.",
      "type": "invalid_request_error",
      "param": "temperature",
      "code": "unsupported_value"
    },
    "code": "unsupported_value",
    "param": "temperature",
    "type": "invalid_request_error",
    "line": 1,
    "column": 28,
    "stack": "Error: 400 Unsupported value: 'temperature' does not support 2 with this model. Only the default (1) value is supported.\n    at new OpenAIError (unknown:1:23)\n    at new APIError (./llmrouter/node_modules/openai/error.mjs:7:9)\n    at new BadRequestError (unknown:1:23)\n    at generate (./llmrouter/node_modules/openai/error.mjs:41:20)\n    at <anonymous> (./llmrouter/node_modules/openai/core.mjs:339:30)"
  },
  "requestParams": {
    "model": "o1-mini",
    "messages": [
      {
        "role": "system" as const,
        "content": "You are a friendly chatbot."
      },
      {
        "role": "user" as const,
        "content": "What is the difference between HTTP and HTTPS?"
      }
    ],
    "stream": false,
    "temperature": 2
  },
  "response": null
}

dotenv.config({ path: path.join(__dirname, "../../.env.test.local") });

describe("o1_mini_openai_1748695186486", () => {
  let router: LlmRouter;

  beforeAll(async () => {
    router = new LlmRouter({ openaiApiKey: process.env.OPENAI_API_KEY });
  });

  test('should map system to user & set temperature to 1', async () => {
    fuzztestReport.requestParams.model = fuzztestReport.model;
    const response = await router.chat(fuzztestReport.requestParams) as OpenAI.Chat.Completions.ChatCompletion;
    expect(response?.choices?.length).toBeGreaterThan(0);
    expect(response?.choices[0]?.message?.content).toBeDefined();
  }, { timeout: 10000 });
});
