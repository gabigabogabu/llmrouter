import type OpenAI from "openai";

export interface LlmHostAdapter {
  listModels(): Promise<OpenAI.Models.Model[]>;
  chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>>;
}