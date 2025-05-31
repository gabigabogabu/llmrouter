import OpenAI, { type ClientOptions } from "openai";

import { AnthropicAdapter } from "./AnthropicAdapter";
import type { LlmHostAdapter } from "./LlmHostAdapter";
import { OpenaiAdapter } from "./OpenaiAdapter";
import { HostNotFoundError, ModelNotFoundError } from "./errors";

const hosts = ["anthropic", "deepseek", "gemini", "openai", "openrouter", "xai"] as const;
type LlmHost = (typeof hosts)[number];
type LlmRouterClientOptions = Omit<ClientOptions, "apiKey" | "baseUrl"> & {[K in LlmHost as `${K}ApiKey`]?: string | undefined;};


export class LlmRouter implements LlmHostAdapter {
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
    xaiApiKey && (this.clients.xai = new OpenaiAdapter({ ...otherOptions, apiKey: xaiApiKey, baseURL: "https://api.x.ai/v1" }));
  }

  /**
   * List all models from a given provider. ModelIds are returned with an additional provider prefix.
   * @param host - The provider to list models from. If not provided, all providers will be queried.
   * @returns A list of models.
   */
  async listModels(host?: LlmHost): Promise<OpenAI.Models.Model[]> {
    if (!host)
      return (await Promise.allSettled(hosts.map(async host => ({host, models: await this.listModels(host)}))))
        .filter(result => result.status === "fulfilled")
        .map(result => result.value.models.map(model => ({ ...model, id: `${model.id}@${result.value.host}` })))
        .flat()
        .sort((a, b) => b.id.localeCompare(a.id));

    return this._tryToGetClient(host).listModels();
  }

  async chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>> {
    const {model, host} = this._parseModelAndHost(params[0].model);
    params[0].model = model;
    return this._tryToGetClient(host).chat(...params);
  }

  /**
   * Get the client for a given provider and model.
   * @param modelIdWithHost - The provider and model to get the client for. Format "<provider>/<model>". Example: "openai/gpt-4o"
   * @returns The client for the given provider and model.
   */
  private _tryToGetClient(host: LlmHost): Exclude<typeof this.clients[keyof typeof this.clients], undefined> {
    const client = this.clients[host];
    if (!client) throw new HostNotFoundError(host)
    return client;
  }

  private _parseModelAndHost(modelIdWithHost: string): {model: string, host: LlmHost} {
    const match = /^(.+)@(.+)$/.exec(modelIdWithHost);
    if (!match) throw new HostNotFoundError(modelIdWithHost);
    const [, model, host] = match;
    if (!model) throw new ModelNotFoundError(modelIdWithHost);
    if (!LlmRouter._isLlmHost(host)) throw new HostNotFoundError(modelIdWithHost);
    return {model, host};
  }

  // type guard
  private static _isLlmHost(host: string | undefined | null): host is LlmHost {
    return hosts.includes(host as LlmHost);
  }
}
