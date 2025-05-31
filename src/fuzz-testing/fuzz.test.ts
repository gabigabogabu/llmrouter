// use `bun test --rerun-each 100` to rerun each test 100 times

import { test, describe, expect, beforeAll } from "bun:test";
import dotenv from "dotenv";
import fs from "fs";
import type OpenAI from "openai";

import { LlmRouter } from "../index";
import { generateRandomSetup } from "./_generateRandomSetup";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env.test.local") });

describe("Fuzz Testing", () => {
  // Global test state
  let router: LlmRouter;
  let availableModels: OpenAI.Models.Model[] = [];

  beforeAll(async () => {
    router = new LlmRouter({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      deepseekApiKey: process.env.DEEPSEEK_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      xaiApiKey: process.env.XAI_API_KEY,
    });

    // Load available models
    try {
      console.log("Loading available models for fuzz testing...");
      availableModels = await router.listModels();
      console.log(`Found ${availableModels.length} available models`);
      const availableHosts = [...new Set(availableModels.map(model => model.id.split("@")[1]).sort())];
      console.log(`Found ${availableHosts.length} available hosts: ${availableHosts.join(", ")}`);
    } catch (error) {
      console.warn("Failed to load models, skipping fuzz tests:", error);
      availableModels = [];
    }
  });

  test("should have available models for testing", () => {
    expect(availableModels.length).toBeGreaterThan(0);
  });

  test.each([
    process.env.ANTHROPIC_API_KEY && "anthropic",
    process.env.DEEPSEEK_API_KEY && "deepseek",
    process.env.GEMINI_API_KEY && "gemini",
    process.env.OPENAI_API_KEY && "openai",
    process.env.OPENROUTER_API_KEY && "openrouter",
    process.env.XAI_API_KEY && "xai"
  ].filter(Boolean))("should have models from %s", (apiKey) => {
    const models = availableModels.filter(model => model.id.endsWith(`@${apiKey}`));
    expect(models.length).toBeGreaterThan(0);
  });

  describe("Conversation Builder", () => {
    test("should generate valid simple conversations", () => {
      for (let i = 0; i < 100; i++) {
        const { messages } = generateRandomSetup();

        expect(messages).toBeInstanceOf(Array);
        expect(messages.length).toBeGreaterThanOrEqual(1);
        expect(messages.length).toBeLessThanOrEqual(5);

        // Validate message structure
        messages.forEach(message => {
          expect(message).toHaveProperty("role");
          expect(message).toHaveProperty("content");
          expect(["system", "user", "assistant"]).toContain(message.role);
          expect(message.content).toBeTypeOf("string");
        });
      }
    });

    test("should generate valid random parameters", () => {
      for (let i = 0; i < 100; i++) {
        const { params } = generateRandomSetup();

        if (params.temperature !== undefined) {
          expect(params.temperature).toBeGreaterThanOrEqual(0);
          expect(params.temperature).toBeLessThanOrEqual(2);
        }

        if (params.max_tokens !== undefined) {
          expect(params.max_tokens).toBeGreaterThanOrEqual(10);
          expect(params.max_tokens).toBeLessThanOrEqual(1000);
        }

        if (params.max_completion_tokens !== undefined) {
          expect(params.max_completion_tokens).toBeGreaterThanOrEqual(10);
          expect(params.max_completion_tokens).toBeLessThanOrEqual(1000);
        }

        if (params.top_p !== undefined) {
          expect(params.top_p).toBeGreaterThanOrEqual(0);
          expect(params.top_p).toBeLessThanOrEqual(1);
        }

        if (params.frequency_penalty !== undefined) {
          expect(params.frequency_penalty).toBeGreaterThanOrEqual(-2);
          expect(params.frequency_penalty).toBeLessThanOrEqual(2);
        }

        if (params.presence_penalty !== undefined) {
          expect(params.presence_penalty).toBeGreaterThanOrEqual(-2);
          expect(params.presence_penalty).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  // bun test -t "fuzztest" --rerun-each 10
  test('fuzztest', async () => {
    const model = availableModels[Math.floor(Math.random() * availableModels.length)];
    if (!model) throw new Error("No models available");
    const { messages, params } = generateRandomSetup();

    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: model.id,
      messages,
      stream: false,
      ...params,
    };

    let response: OpenAI.Chat.Completions.ChatCompletion | null = null;
    try {
      response = await router.chat(requestParams) as OpenAI.Chat.Completions.ChatCompletion;
      expect(response).toBeDefined();
      expect(response.choices).toBeInstanceOf(Array);
      expect(response.choices.length).toBeGreaterThan(0);
      expect(response.choices[0]?.message).toBeDefined();
      expect(response.choices[0]?.message?.content).toBeDefined();
      expect(response.choices[0]?.message?.content?.length).toBeGreaterThan(0);
    } catch (error) {
      saveTestCaseError(model, error, requestParams, response);
      throw error;
    }
  }, {
    // repeats: 10, // doesn't work, use `bun test -t "fuzztest" --rerun-each 10` instead
    timeout: 30000
  });
});

const saveTestCaseError = (model: OpenAI.Models.Model, error: unknown, requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams, response: OpenAI.Chat.Completions.ChatCompletion | null) => {
  const serializableError = (error: unknown) => {
    const stripAnsi = (str: unknown) => typeof str === 'string' ? str.replace(/\u001b\[[0-9;]+m/g, '') : str;
    const entries = Object.getOwnPropertyNames(error)
      .map(key => [key, stripAnsi((error as any)[key])])
      .filter(([key, value]) => value !== undefined)
    const reconstructed = Object.fromEntries(entries);
    return reconstructed;
  }

  const dirPath = path.join(__dirname, "failed-test-cases");
  const fileName = `${model.id.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.json`;
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(
    path.join(dirPath, fileName),
    JSON.stringify({ model: model.id, error: serializableError(error), requestParams, response }, null, 2)
  );
}


