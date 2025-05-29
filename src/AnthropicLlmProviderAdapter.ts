import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageParam,
  StopReason,
} from "@anthropic-ai/sdk/resources";
import OpenAI from "openai";
import type { ClientOptions } from "openai";
import type {
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartInputAudio,
  ChatCompletionContentPartRefusal,
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
  ChatCompletionChunk,
  ChatCompletion,
} from "openai/resources.mjs";
import { Stream } from "openai/streaming.mjs";

import { ModelNotFoundError, ModalityNotSupportedError } from "./errors";
import type { LlmProviderAdapter } from "./LlmProviderAdapter";

const null2Undefined = (value: any): any => value === null ? undefined : value;

export class AnthropicAdapter implements LlmProviderAdapter {
  private client: Anthropic;

  constructor(params: ClientOptions) {
    const { fetch, ...withoutFetch } = params;
    this.client = new Anthropic({ ...withoutFetch, });
  }

  async listModels(): Promise<OpenAI.Models.Model[]> {
    const models = [];
    for await (const model of this.client.models.list()) {
      models.push({
        id: model.id,
        created: +new Date(model.created_at),
        object: model.type,
        owned_by: '',
      });
    }
    return models;
  }

  async chat(...params: Parameters<typeof OpenAI.prototype.chat.completions.create>): Promise<ReturnType<typeof OpenAI.prototype.chat.completions.create>> {
    const [body, options] = params;
    const [provider, model] = body.model.split("/");
    if (!model) throw new ModelNotFoundError(body.model);

    // TODO: system prompt
    const messages: Anthropic.Messages.MessageParam[] = body.messages
      .map(AnthropicAdapter.mapMessageOpenai2Anthropic)
      .filter(message => !!message);

    let service_tier: Anthropic.Messages.MessageCreateParams['service_tier'];
    if (body.service_tier === 'auto') service_tier = 'auto';
    if (body.service_tier === 'default') service_tier = 'standard_only';
    if (body.service_tier === 'flex') service_tier = 'auto';

    const { __streamClass, ...optsWoStreamClass } = options || {};

    const reply = await this.client.messages.create({
      ...body,
      messages,
      model,
      stream: null2Undefined(body.stream),
      max_tokens: body.max_completion_tokens || body.max_tokens || 1000,
      metadata: null2Undefined(body.metadata),
      service_tier,
      temperature: null2Undefined(body.temperature),
      top_p: null2Undefined(body.top_p),

      // TODO: implement tool use
      tool_choice: undefined,
      tools: undefined,
    }, {
      ...optsWoStreamClass,
      query: null2Undefined(options?.query),
    });

    const result = AnthropicAdapter.mapMessageAnthropic2Openai(reply, model);
    if (!result) throw new Error('Failed to read Anthropic response');
    return result;
  }

  // OpenAI -> Anthropic
  private static mapMessageOpenai2Anthropic(message: ChatCompletionMessageParam): MessageParam | undefined {
    if (message.role === 'user' || message.role === 'assistant') {
      return {
        role: message.role,
        content: AnthropicAdapter.mapContentOpenai2Anthropic(message.content),
      }
    }
    if (message.role === 'system' || message.role === 'developer') {
      // use dedicated system param
      return undefined
    }
    if (message.role === 'function') {
      return {
        role: 'assistant',
        content: `[Function call: ${message.name} (${message.content})]`
      }
    }
    if (message.role === 'tool') {
      return {
        role: 'assistant',
        content: `[Tool use: ${message.tool_call_id} (${message.content})]`
      }
    }
  }

  private static mapContentOpenai2Anthropic(content: ChatCompletionMessageParam['content']): MessageParam['content'] {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(AnthropicAdapter.mapContentPartOpenai2Anthropic);
    throw new Error('Could not convert message content')
  }

  private static mapContentPartOpenai2Anthropic(part: ChatCompletionContentPart | ChatCompletionContentPartRefusal): ContentBlockParam {
    if (AnthropicAdapter._isTextPart(part)) return { type: 'text', text: part.text };
    if (AnthropicAdapter._isRefusalPart(part)) return { type: 'text', text: part.refusal };
    if (AnthropicAdapter._isImagePart(part)) return { type: 'image', source: { type: 'url', url: part.image_url.url } };
    if (AnthropicAdapter._isAudioPart(part)) throw new ModalityNotSupportedError('audio');
    if (AnthropicAdapter._isFilePart(part)) {
      if (!part.file.file_data) throw new Error('Empty file')
      return { type: 'document', source: { type: 'base64', data: part.file.file_data, media_type: 'application/pdf' } };
    };
    throw new ModalityNotSupportedError(`Unknown message content part type: ${(part as ChatCompletionContentPart).type}. ${JSON.stringify(part)}`)
  }

  // Anthropic -> OpenAI
  private static mapMessageAnthropic2Openai(message: Awaited<ReturnType<typeof Anthropic.prototype.messages.create>>, model: string): Awaited<ReturnType<typeof OpenAI.prototype.chat.completions.create>> | null {
    if (!message) return null;
    if ('id' in message) {
      return {
        id: message.id,
        choices: [{
          message: {
            role: 'assistant',
            content: message.content.map(AnthropicAdapter.mapContentBlockAnthropic2Openai).join('\n'),
            refusal: null,
          },
          index: 0,
          finish_reason: AnthropicAdapter._getOrDefaultFinishReason(message.stop_reason),
          logprobs: null,
        }],
        created: +new Date(),
        model: message.model,
        object: 'chat.completion',
        // TODO
        service_tier: undefined,
        usage: undefined,
      }
    }
    // streaming response
    const anthropicStream = message;
    async function* iterator(): AsyncIterator<ChatCompletionChunk, any, undefined> {
      let messageId = '';
      for await (const event of anthropicStream) {
        try {
          if (event.type === 'message_start') messageId = event.message.id;
          const chunk = AnthropicAdapter.mapAnthropicStreamEventToOpenaiChunk(event, model);
          if (chunk) {
            chunk.id = messageId;
            yield chunk
          };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          console.error('Anthropic stream error:', error);
          // throw error;
        }
      }
    }

    return new Stream(iterator, anthropicStream.controller);
  }

  private static mapContentBlockAnthropic2Openai(content: Anthropic.Messages.ContentBlock): string | null {
    switch (content.type) {
      case 'text':
        return content.text;
      case 'tool_use':
      case 'server_tool_use':
      case 'web_search_tool_result':
      case 'thinking':
      case 'redacted_thinking':
      default:
        return Object.entries(content).map(([key, value]) => `${key}=${value}`).join(' ');
    }
  }

  private static mapAnthropicStreamEventToOpenaiChunk(event: Anthropic.Messages.MessageStreamEvent, model: string): ChatCompletionChunk | null {
    const timestamp = Math.floor(Date.now() / 1000);

    const chunk: ChatCompletionChunk = {
      id: 'message' in event ? event.message.id : '',
      object: 'chat.completion.chunk',
      created: timestamp,
      model: 'message' in event ? event.message.model : model,
      choices: [{
        index: 0,
        delta: {},
        logprobs: null,
        finish_reason: 'message' in event ? AnthropicAdapter._getOrDefaultFinishReasonWithNull(event.message.stop_reason) : null,
      }],
    }

    if (event.type === 'message_start') chunk.choices[0]!.delta = { role: event.message.role, content: '' };
    if (event.type === 'message_stop') chunk.choices[0]!.finish_reason = 'stop';
    if (event.type === 'message_delta') { } // event.delta.stop_reason already set

    if (event.type === 'content_block_start') chunk.choices[0]!.delta = { content: '' };
    if (event.type === 'content_block_stop') chunk.choices[0]!.delta = { content: '' };
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') chunk.choices[0]!.delta = { content: event.delta.text };
      if (event.delta.type === 'input_json_delta') chunk.choices[0]!.delta = { content: event.delta.partial_json };
      if (event.delta.type === 'thinking_delta') chunk.choices[0]!.delta = { content: event.delta.thinking };
      if (event.delta.type === 'signature_delta') chunk.choices[0]!.delta = { content: event.delta.signature };
      if (event.delta.type === 'citations_delta') chunk.choices[0]!.delta = { content: JSON.stringify(event.delta.citation) };
    }

    return chunk;
  }

  // finish reason mapping
  private static _finishReasonMap: Record<StopReason, ChatCompletionChunk['choices'][number]['finish_reason']> = {
    'end_turn': 'stop' as const,
    'max_tokens': 'length' as const,
    'stop_sequence': 'stop' as const,
    'tool_use': 'tool_calls' as const,
    'pause_turn': 'stop' as const,
    'refusal': 'content_filter' as const,
  }
  private static _getOrDefaultFinishReasonWithNull(stopReason: StopReason | null): ChatCompletionChunk['choices'][number]['finish_reason'] {
    return (stopReason && AnthropicAdapter._finishReasonMap[stopReason]) || null;
  }
  private static _getOrDefaultFinishReason(stopReason: StopReason | null): ChatCompletion.Choice['finish_reason'] {
    return AnthropicAdapter._getOrDefaultFinishReasonWithNull(stopReason) || 'stop';
  }

  // Type guards
  private static _isTextPart(part: PartType): part is ChatCompletionContentPartText { return part.type === 'text' }
  private static _isRefusalPart(part: PartType): part is ChatCompletionContentPartRefusal { return part.type === 'refusal' }
  private static _isAudioPart(part: PartType): part is ChatCompletionContentPartInputAudio { return part.type === 'input_audio' }
  private static _isImagePart(part: PartType): part is ChatCompletionContentPartImage { return part.type === 'image_url' }
  private static _isFilePart(part: PartType): part is ChatCompletionContentPart.File { return part.type === 'file' }
}

type PartType = ChatCompletionContentPart | ChatCompletionContentPartRefusal;