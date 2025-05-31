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
    if (params[0].model === 'gpt-4o-mini-search-preview') {
      // Model incompatible request argument supplied: presence_penalty
      params[0].presence_penalty = undefined;
    }
    return await this.client.chat.completions.create(...params);
  }
}