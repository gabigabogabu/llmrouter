// use `bun test --rerun-each 100` to rerun each test 100 times

import { test, describe, expect, beforeAll } from "bun:test";
import dotenv from "dotenv";

import { LlmRouter } from "../../index";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env.test.local") });

const fuzztestReport = {
  "model": "codex-mini-latest@openai",
  "errorObject": {
    "message": "404 This model is only supported in v1/responses and not in v1/chat/completions.",
    "status": 404,
    "headers": "<redacted>",
    "request_id": "<redacted>",
    "error": {
      "message": "This model is only supported in v1/responses and not in v1/chat/completions.",
      "type": "invalid_request_error",
      "param": "model",
      "code": null
    },
    "code": null,
    "param": "model",
    "type": "invalid_request_error",
    "line": 1,
    "column": 28,
    "stack": "Error: 404 This model is only supported in v1/responses and not in v1/chat/completions.\n    at new OpenAIError (unknown:1:28)\n    at new APIError (./llmrouter/node_modules/openai/error.mjs:7:9)\n    at new NotFoundError (unknown:1:28)\n    at generate (./llmrouter/node_modules/openai/error.mjs:50:24)\n    at <anonymous> (./llmrouter/node_modules/openai/core.mjs:339:30)"
  },
  "requestParams": {
    "model": "codex-mini-latest",
    "messages": [
      {
        "role": "system",
        "content": "You are an expert in science and technology."
      },
      {
        "role": "assistant",
        "content": "That's a great question! Let me explain."
      },
      {
        "role": "user",
        "content": "Explain quantum physics in simple terms."
      }
    ],
    "stream": false,
    "presence_penalty": 0
  },
  "response": null
}


describe("codex_mini_latest_openai_1748632727051.test", () => {
  let router: LlmRouter;

  beforeAll(async () => {
    router = new LlmRouter({ openaiApiKey: process.env.OPENAI_API_KEY });
  });

  test('codex_mini_latest should be banned', async () => {
    fuzztestReport.requestParams.model = fuzztestReport.model;
    const response = await router.listModels();
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    expect(response.map(model => model.id)).not.toContain(fuzztestReport.model);
  });
});
