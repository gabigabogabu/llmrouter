import OpenAI from "openai";
import type { ClientOptions } from "openai";
import type { LlmHostAdapter } from "./LlmHostAdapter";

export class OpenaiAdapter implements LlmHostAdapter {
  private client: OpenAI;

  private _modelBlocklist: string[] = [
    'codex-mini-latest', // does not support chat completions
    'omni-moderation-2024-09-26', // does not support chat completions
    'gpt-4o-transcribe', // does not support chat completions
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
    if (params[0].model === 'o1-mini') {
      // Unsupported value: 'messages[0].role' does not support 'system' with this model.
      params[0].messages = params[0].messages.map(message => message.role === 'system' ? { ...message, role: 'user' } : message);
      // Unsupported value: 'temperature' does not support 2 with this model. Only the default (1) value is supported.
      params[0].temperature && (params[0].temperature = 1);
    }
    return await this.client.chat.completions.create(...params);
  }
}