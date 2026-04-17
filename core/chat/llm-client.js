'use strict';

/**
 * LLM Client – OpenAI-compatible Chat Completions wrapper.
 *
 * Config via env vars:
 *   LLM_API_BASE  – base URL (e.g. https://newapi.ksite.xin/v1)
 *   LLM_API_KEY   – bearer token
 *   LLM_MODEL     – model name (default: glm-4.7)
 */

class LlmClient {
  constructor() {
    this.apiBase = (process.env.LLM_API_BASE || '').replace(/\/+$/, '');
    this.apiKey = process.env.LLM_API_KEY || '';
    this.model = process.env.LLM_MODEL || 'glm-4.7';
    /** @type {Set<AbortController>} */
    this._activeControllers = new Set();
  }

  /**
   * Abort the currently active streaming request (if any).
   */
  abortActive() {
    for (const controller of this._activeControllers) {
      controller.abort();
    }
    this._activeControllers.clear();
  }

  /**
   * Check if the client is properly configured.
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.apiBase && this.apiKey);
  }

  /**
   * Send a chat completion request.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {{ timeout?: number }} [options]
   * @returns {Promise<string>} assistant reply content
   */
  async chat(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('LLM 未配置。请检查 LLM_API_BASE 和 LLM_API_KEY 环境变量。');
    }

    const timeout = options.timeout || 60_000;
    const url = `${this.apiBase}/chat/completions`;

    const controller = new AbortController();
    this._activeControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`LLM API 错误 (${res.status}): ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('LLM 返回了空回复。');
      }
      return content;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('LLM 请求超时，请稍后重试。');
      }
      throw err;
    } finally {
      clearTimeout(timer);
      this._activeControllers.delete(controller);
    }
  }

  /**
   * Send a non-streaming tool-call constrained request.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {{ tools: Array<Object>, toolChoice?: Object, timeout?: number, signal?: AbortSignal, model?: string }} options
   * @returns {Promise<{ toolCalls: Array<Object>, content: string }>}
   */
  async chatTool(messages, { tools, toolChoice, timeout: timeoutMs, signal, model } = {}) {
    if (!this.isConfigured()) {
      throw new Error('LLM 未配置。请检查 LLM_API_BASE 和 LLM_API_KEY 环境变量。');
    }

    const timeout = timeoutMs || 45_000;
    const url = `${this.apiBase}/chat/completions`;
    const controller = new AbortController();
    this._activeControllers.add(controller);
    let didTimeout = false;
    const timer = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.model,
          messages,
          tools,
          tool_choice: toolChoice,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`LLM API 错误 (${res.status}): ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      const message = data?.choices?.[0]?.message || {};
      return {
        toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
        content: typeof message.content === 'string' ? message.content : '',
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(didTimeout ? 'LLM 请求超时。' : 'LLM 请求已中断。');
      }
      throw err;
    } finally {
      clearTimeout(timer);
      this._activeControllers.delete(controller);
    }
  }
  /**
   * Send a chat completion request with streaming.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {{ onChunk?: (text: string) => void, onThinking?: (text: string) => void, timeout?: number }} options
   * @returns {Promise<{ content: string, aborted: boolean }>} full assistant reply content
   */
  async chatStream(messages, { onChunk, onThinking, timeout: timeoutMs, signal } = {}) {
    if (!this.isConfigured()) {
      throw new Error('LLM 未配置。请检查 LLM_API_BASE 和 LLM_API_KEY 环境变量。');
    }

    const timeout = timeoutMs || 120_000;
    const url = `${this.apiBase}/chat/completions`;

    const controller = new AbortController();
    this._activeControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeout);
    let fullContent = '';

    // Forward external abort signal
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`LLM API 错误 (${res.status}): ${body.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep incomplete last line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json?.choices?.[0]?.delta || {};
            const thinkingDelta =
              delta.reasoning_content ||
              delta.reasoning ||
              delta.thinking ||
              json?.choices?.[0]?.reasoning_content ||
              json?.choices?.[0]?.reasoning ||
              '';
            const contentDelta = delta.content;

            if (thinkingDelta && onThinking) {
              onThinking(thinkingDelta);
            }

            if (contentDelta) {
              fullContent += contentDelta;
              if (onChunk) onChunk(contentDelta);
            }
          } catch (_e) {
            // Skip malformed JSON lines
          }
        }
      }

      if (!fullContent) {
        throw new Error('LLM 返回了空回复。');
      }
      return { content: fullContent, aborted: false };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { content: fullContent, aborted: true };
      }
      throw err;
    } finally {
      clearTimeout(timer);
      this._activeControllers.delete(controller);
    }
  }
}

module.exports = LlmClient;
