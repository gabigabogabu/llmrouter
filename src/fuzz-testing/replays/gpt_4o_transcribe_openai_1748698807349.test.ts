import { test, describe, expect, beforeAll } from "bun:test";
import dotenv from "dotenv";

import { LlmRouter } from "../../index";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env.test.local") });

const fuzztestReport = {
  "model": "gpt-4o-transcribe@openai",
  "error": {
    "message": "404 This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?",
    "status": 404,
    "headers": "<redacted>",
    "request_id": "<redacted>",
    "error": {
      "message": "This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?",
      "type": "invalid_request_error",
      "param": "model",
      "code": null
    },
    "code": null,
    "param": "model",
    "type": "invalid_request_error",
    "line": 1,
    "column": 28,
    "stack": "Error: 404 This is not a chat model and thus not supported in the v1/chat/completions endpoint. Did you mean to use v1/completions?\n    at new OpenAIError (unknown:1:28)\n    at new APIError (./llmrouter/node_modules/openai/error.mjs:7:9)\n    at new NotFoundError (unknown:1:28)\n    at generate (./llmrouter/node_modules/openai/error.mjs:50:24)\n    at <anonymous> (./llmrouter/node_modules/openai/core.mjs:339:30)"
  },
  "requestParams": {
    "model": "gpt-4o-transcribe",
    "messages": [
      {
        "role": "user",
        "content": "How do you make a sandwich?"
      },
      {
        "role": "system",
        "content": "You are an expert researcher."
      },
      {
        "role": "assistant",
        "content": "That's an interesting question. Let me think about that."
      },
      {
        "role": "system",
        "content": "You are a math tutor."
      },
      {
        "role": "assistant",
        "content": "That's something I can definitely assist with."
      }
    ],
    "stream": false
  },
  "response": null
}

describe("gpt_4o_transcribe_openai_1748698807349", () => {
  let router: LlmRouter;

  beforeAll(async () => {
    router = new LlmRouter({ openaiApiKey: process.env.OPENAI_API_KEY });
  });

  test('gpt-4o-transcribe should be banned', async () => {
    fuzztestReport.requestParams.model = fuzztestReport.model;
    const response = await router.listModels();
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    expect(response.map(model => model.id)).not.toContain(fuzztestReport.model);
  });
});