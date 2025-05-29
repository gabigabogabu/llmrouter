import type OpenAI from "openai";

export interface LlmProviderAdapter {
  listModels(): Promise<OpenAI.Models.Model[]>;
  chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>>;
}