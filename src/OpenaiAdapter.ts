import OpenAI from "openai";
import type { ClientOptions } from "openai";
import type { LlmHostAdapter } from "./LlmHostAdapter";

export class OpenaiAdapter implements LlmHostAdapter {
  private client: OpenAI;

  private _modelBlocklist: string[] = [
    'codex-mini-latest', // does not support chat completions
    'omni-moderation-2024-09-26', // does not support chat completions
  ];

  constructor(params: ClientOptions) {
    this.client = new OpenAI(params);
  }

  async listModels(): Promise<OpenAI.Models.Model[]> {
    const models = [];
    for await (const model of this.client.models.list()) {
      if (!this._modelBlocklist.includes(model.id)) 
        models.push(model);
    }
    return models;
  }

  async chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>> {
    return await this.client.chat.completions.create(...params);
  }
}