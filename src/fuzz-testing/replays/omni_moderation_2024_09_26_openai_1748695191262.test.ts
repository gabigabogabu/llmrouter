import { test, describe, expect, beforeAll } from "bun:test";
import dotenv from "dotenv";

import { LlmRouter } from "../../index";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env.test.local") });

const fuzztestReport = {
  "model": "omni-moderation-2024-09-26@openai",
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
    "model": "omni-moderation-2024-09-26",
    "messages": [
      {
        "role": "assistant",
        "content": "That's an excellent point. Allow me to elaborate."
      }
    ],
    "stream": false
  },
  "response": null
}

describe("o1_mini_openai_1748695186486", () => {
  let router: LlmRouter;

  beforeAll(async () => {
    router = new LlmRouter({ openaiApiKey: process.env.OPENAI_API_KEY });
  });

  test('omni-moderation-2024-09-26 should be banned', async () => {
    fuzztestReport.requestParams.model = fuzztestReport.model;
    const response = await router.listModels();
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    expect(response.map(model => model.id)).not.toContain(fuzztestReport.model);
  });
});