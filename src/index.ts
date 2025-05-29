import OpenAI from "openai";

import { OpenaiAdapter } from "./OpenaiLlmProviderAdapter";
import { AnthropicAdapter } from "./AnthropicLlmProviderAdapter";
import type { LlmProviderAdapter } from "./LlmProviderAdapter";

const providers = ["anthropic", "deepseek", "gemini", "openai", "openrouter", "xai"] as const;
type LlmProvider = (typeof providers)[number];
type LlmRouterClientOptions = Omit<ConstructorParameters<typeof OpenAI>, "apiKey" | "baseUrl"> & {
  [K in LlmProvider as `${K}ApiKey`]: string | undefined;
};

class ProviderNotFoundError extends Error {
  constructor(provider: string) {
    super(`No client found for provider ${provider}`);
  }
}

export class LlmRouter implements LlmProviderAdapter {
  private clients: {
    anthropic?: AnthropicAdapter;
    deepseek?: OpenaiAdapter;
    gemini?: OpenaiAdapter;
    openai?: OpenaiAdapter;
    openrouter?: OpenaiAdapter;
    xai?: OpenaiAdapter;
  } = {};

  constructor({
    anthropicApiKey,
    deepseekApiKey,
    geminiApiKey,
    openaiApiKey,
    openrouterApiKey,
    xaiApiKey,
    ...otherOptions
  }: LlmRouterClientOptions) {
    const withoutFetch = { ...otherOptions, fetch: undefined };
    anthropicApiKey && (this.clients.anthropic = new AnthropicAdapter({ ...withoutFetch, apiKey: anthropicApiKey }));
    deepseekApiKey && (this.clients.deepseek = new OpenaiAdapter({ ...otherOptions, apiKey: deepseekApiKey, baseURL: "https://api.deepseek.com" }));
    geminiApiKey && (this.clients.gemini = new OpenaiAdapter({ ...otherOptions, apiKey: geminiApiKey, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }));
    openaiApiKey && (this.clients.openai = new OpenaiAdapter({ ...otherOptions, apiKey: openaiApiKey }));
    openrouterApiKey && (this.clients.openrouter = new OpenaiAdapter({ ...otherOptions, apiKey: openrouterApiKey, baseURL: "https://openrouter.ai/api/v1" }));
    xaiApiKey && (this.clients.xai = new OpenaiAdapter({ ...otherOptions, apiKey: xaiApiKey, baseURL: "https://api.xai.ai/v1" }));
  }

  /**
   * List all models from a given provider.
   * @param provider - The provider to list models from. If not provided, all providers will be queried.
   * @returns A list of models.
   */
  async listModels(provider?: LlmProvider): Promise<OpenAI.Models.Model[]> {
    if (!provider)
      return (await Promise.allSettled(providers.map(async provider => ({provider, models: await this.listModels(provider)}))))
        .filter(result => result.status === "fulfilled")
        .map(result => result.value.models.map(model => ({ ...model, id: `${result.value.provider}/${model.id}` })))
        .flat()
        .sort((a, b) => b.id.localeCompare(a.id));

    return this._tryToGetClient(provider).listModels();
  }

  async chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>> {
    const [body] = params;
    return this._tryToGetClient(body.model).chat(...params);
  }

  /**
   * Get the client for a given provider and model.
   * @param providerAndModel - The provider and model to get the client for. Format "<provider>/<model>". Example: "openai/gpt-4o"
   * @returns The client for the given provider and model.
   */
  private _tryToGetClient(providerAndModel: string): Exclude<typeof this.clients[keyof typeof this.clients], undefined> {
    const [provider, model] = providerAndModel.split("/");
    if (!providers.includes(provider as LlmProvider)) throw new ProviderNotFoundError(providerAndModel);
    const client = this.clients[provider as LlmProvider];
    if (!client) throw new ProviderNotFoundError(providerAndModel)
    return client;
  }
}