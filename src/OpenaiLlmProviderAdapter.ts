import OpenAI from "openai";
import type { ClientOptions } from "openai";
import type { LlmProviderAdapter } from "./LlmProviderAdapter";

export class OpenaiAdapter implements LlmProviderAdapter {
  private client: OpenAI;
  constructor(params: ClientOptions) {
    this.client = new OpenAI(params);
  }

  async listModels(): Promise<OpenAI.Models.Model[]> {
    const models = [];
    for await (const model of this.client.models.list()) models.push(model);
    return models;
  }

  async chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>> {
    return await this.client.chat.completions.create(...params);
  }
}