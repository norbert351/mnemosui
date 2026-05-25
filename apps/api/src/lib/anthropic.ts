import type { ChatMessage } from "../types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODEL = "openrouter/free";
const FALLBACK_MODELS = [
  "openai/gpt-oss-120b:free",
  "deepseek/deepseek-v4-flash:free",
];
const PRIMARY_MODEL = FREE_MODEL;
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 1_500;

interface OpenRouterChoiceDelta {
  delta?: {
    content?: string;
  };
}

interface OpenRouterStreamChunk {
  choices?: OpenRouterChoiceDelta[];
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface OpenRouterAttempt {
  response?: Response;
  status?: number;
  rateLimited: boolean;
  error?: Error;
}

export class AIError extends Error {
  public readonly statusCode = 502;
  public readonly code = "AI_REQUEST_FAILED";

  public constructor(message = "AI request failed") {
    super(message);
    this.name = "AIError";
  }
}

class OpenRouterStreamError extends AIError {
  public constructor(
    public readonly textChunks: number,
    message = "OpenRouter stream interrupted"
  ) {
    super(message);
    this.name = "OpenRouterStreamError";
  }
}

export { AIError as AnthropicError };

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes("your_openrouter_key_here")) {
    throw new AIError("OPENROUTER_API_KEY is not configured in apps/api/.env");
  }
  return apiKey;
}

function getModelOrder(): string[] {
  return [FREE_MODEL, ...FALLBACK_MODELS];
}

function toOpenRouterMessages(
  messages: ChatMessage[],
  system?: string
): OpenRouterMessage[] {
  const openRouterMessages: OpenRouterMessage[] = [];

  if (system) {
    openRouterMessages.push({ role: "system", content: system });
  }

  for (const message of messages) {
    openRouterMessages.push({
      role: message.role,
      content: message.content,
    });
  }

  return openRouterMessages;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function createTimeoutController(parentSignal?: AbortSignal): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    console.error("[openrouter] request timeout");
    controller.abort(new Error("OpenRouter request timed out"));
  }, REQUEST_TIMEOUT_MS);

  const abortFromParent = () => {
    if (!timedOut) {
      controller.abort(parentSignal?.reason);
    }
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      abortFromParent();
    } else {
      parentSignal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", abortFromParent);
    },
  };
}

function isRateLimitedResponse(status: number, body: string): boolean {
  const normalized = body.toLowerCase();
  return (
    status === 429 ||
    normalized.includes("rate limit") ||
    normalized.includes("rate_limit") ||
    normalized.includes("too many requests")
  );
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status >= 500;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new Error("OpenRouter retry aborted"));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal.reason ?? new Error("OpenRouter retry aborted"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function extractTextFromStreamData(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as OpenRouterStreamChunk;
    const text = parsed.choices?.[0]?.delta?.content;
    return typeof text === "string" && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function openRouterFetch(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getOpenRouterApiKey()}`,
      "http-referer": "http://localhost:5173",
      "x-title": "MnemoSui",
    },
    signal,
    body: JSON.stringify(body),
  });
}

async function createOpenRouterRequest(
  model: string,
  messages: OpenRouterMessage[],
  stream: boolean,
  maxTokens: number,
  temperature: number,
  signal?: AbortSignal
): Promise<Response> {
  return openRouterFetch(
    {
      model,
      messages,
      stream,
      max_tokens: maxTokens,
      temperature,
    },
    signal
  );
}

async function createOpenRouterRequestWithRetry(
  model: string,
  messages: OpenRouterMessage[],
  stream: boolean,
  maxTokens: number,
  temperature: number,
  signal: AbortSignal
): Promise<OpenRouterAttempt> {
  try {
    const firstResponse = await createOpenRouterRequest(
      model,
      messages,
      stream,
      maxTokens,
      temperature,
      signal
    );

    if (firstResponse.ok) {
      return { response: firstResponse, rateLimited: false };
    }

    const firstBody = await firstResponse.text().catch(() => "");
    const rateLimited = isRateLimitedResponse(firstResponse.status, firstBody);

    if (isRetryableStatus(firstResponse.status)) {
      console.warn("[openrouter] retrying model once", {
        model,
        status: firstResponse.status,
      });
      await delay(RETRY_DELAY_MS, signal);

      const retryResponse = await createOpenRouterRequest(
        model,
        messages,
        stream,
        maxTokens,
        temperature,
        signal
      );

      if (retryResponse.ok) {
        return { response: retryResponse, rateLimited: false };
      }

      const retryBody = await retryResponse.text().catch(() => "");
      return {
        status: retryResponse.status,
        rateLimited: rateLimited || isRateLimitedResponse(retryResponse.status, retryBody),
      };
    }

    return {
      status: firstResponse.status,
      rateLimited,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error, rateLimited: false };
    }

    return { error: new Error(String(error)), rateLimited: false };
  }
}

async function readOpenRouterStream(
  response: Response,
  onText: (text: string) => void
): Promise<number> {
  if (response.body === null) {
    throw new OpenRouterStreamError(0, "OpenRouter stream failed: missing response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let textChunks = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trimStart();
          if (data === "[DONE]") {
            return textChunks;
          }

          const text = extractTextFromStreamData(data);
          if (text !== null) {
            textChunks++;
            onText(text);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof OpenRouterStreamError) {
      throw error;
    }

    throw new OpenRouterStreamError(
      textChunks,
      error instanceof Error ? error.message : "OpenRouter stream interrupted"
    );
  } finally {
    reader.releaseLock();
  }

  return textChunks;
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  onText: (text: string) => void,
  signal: AbortSignal,
  system?: string
): Promise<void> {
  console.info("[openrouter] stream starting");
  const timeout = createTimeoutController(signal);

  try {
    const openRouterMessages = toOpenRouterMessages(messages, system);
    const models = getModelOrder();
    let lastError: Error | undefined;
    let sawRateLimit = false;

    for (let index = 0; index < models.length; index++) {
      const model = models[index];

      if (index > 0) {
        console.warn("[openrouter] fallback...", { model });
      }

      console.info("[openrouter] trying model...", { model });
      const attempt = await createOpenRouterRequestWithRetry(
        model,
        openRouterMessages,
        true,
        1024,
        0.7,
        timeout.signal
      );

      if (signal.aborted) {
        throw signal.reason ?? new AIError("OpenRouter request aborted");
      }

      if (!attempt.response) {
        sawRateLimit = sawRateLimit || attempt.rateLimited;
        lastError = attempt.error ?? new AIError(
          attempt.status
            ? `OpenRouter model failed with HTTP ${attempt.status}`
            : "OpenRouter model failed"
        );
        continue;
      }

      try {
        const textChunks = await readOpenRouterStream(attempt.response, onText);

        if (textChunks > 0) {
          console.info("[openrouter] success...", { model, textChunks });
          return;
        }

        lastError = new AIError("OpenRouter returned an empty response");
        console.warn("[openrouter] empty response", { model });
      } catch (error) {
        if (signal.aborted) {
          throw signal.reason ?? error;
        }

        if (error instanceof OpenRouterStreamError && error.textChunks > 0) {
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (sawRateLimit) {
      throw new AIError("OpenRouter rate limited. Wait 30 seconds and try again.");
    }

    throw new AIError(lastError?.message ?? "OpenRouter returned an empty response");
  } catch (error) {
    if (timeout.didTimeout() || (isAbortError(error) && !signal.aborted)) {
      throw new AIError("OpenRouter request timed out");
    }

    console.error("[openrouter] stream failed", error);
    throw error;
  } finally {
    timeout.cleanup();
  }
}

export async function summarizeMemory(content: string): Promise<string> {
  const fallback = content.trim().slice(0, 100).replace(/\n/g, " ");

  try {
    const body = {
      model: PRIMARY_MODEL,
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `Write one short sentence (under 80 chars) summarizing this:\n${content.slice(0, 500)}`,
        },
      ],
    };

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${getOpenRouterApiKey()}`,
        "http-referer": "http://localhost:5173",
        "x-title": "MnemoSui",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn("[openrouter] summarize HTTP failed, using fallback");
      return fallback;
    }

    const parsed = (await response.json()) as OpenRouterCompletionResponse;
    const raw = parsed.choices?.[0]?.message?.content?.trim() ?? "";

    if (!raw) {
      console.warn("[openrouter] summarize returned empty, using fallback");
      return fallback;
    }

    if (raw.length > 200) {
      console.warn("[openrouter] summarize response too long, using fallback");
      return fallback;
    }

    console.info("[openrouter] summarize complete");
    return raw;
  } catch (err) {
    console.warn("[openrouter] summarize threw, using fallback:", err);
    return fallback;
  }
}
