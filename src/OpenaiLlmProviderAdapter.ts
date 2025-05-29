import OpenAI from "openai";
import type { ClientOptions } from "openai";
import type { LlmProviderAdapter } from "./LlmProviderAdapter";

export class OpenaiAdapter implements LlmProviderAdapter {
  private client: OpenAI;
  constructor(params: ClientOptions) {
    this.client = new OpenAI(params);
  }

  async listModels(): Promise<OpenAI.Models.Model[]> {
    const models: OpenAI.Models.Model[] = [];
    let hasMore = true;
    do {
      const resp = await this.client.models.list();
      models.push(...resp.data);
      hasMore = resp.hasNextPage();
    } while (hasMore);
    return models;
  }

  async chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>> {
    return await this.client.chat.completions.create(...params);
  }
}