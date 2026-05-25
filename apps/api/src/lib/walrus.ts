import { getSuiNetworkConfig, type SuiNetwork } from "./network";
import type { Memory, WalrusStoreResponse } from "../types";
import { validateMemory } from "../validate";

const AGGREGATOR_TIMEOUT_MS = 8_000;
const PUBLISHER_TIMEOUT_MS = 30_000;

export class WalrusError extends Error {
  public readonly statusCode = 502;
  public readonly code = "WALRUS_REQUEST_FAILED";

  public constructor(message = "Walrus request failed") {
    super(message);
    this.name = "WalrusError";
  }
}

function truncateBlobId(blobId: string): string {
  return blobId.length > 14 ? `${blobId.slice(0, 6)}...${blobId.slice(-6)}` : blobId;
}

function extractBlobId(response: unknown): string {
  const data = response as Partial<WalrusStoreResponse>;

  if ("newlyCreated" in data && typeof data.newlyCreated?.blobObject.blobId === "string") {
    return data.newlyCreated.blobObject.blobId;
  }

  if ("alreadyCertified" in data && typeof data.alreadyCertified?.blobId === "string") {
    return data.alreadyCertified.blobId;
  }

  throw new WalrusError();
}

function isNetworkTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const cause = error.cause;
  const causeCode =
    typeof cause === "object" && cause !== null && "code" in cause
      ? String((cause as { code?: unknown }).code)
      : "";

  return (
    error.name === "AbortError" ||
    error.message.includes("UND_ERR_CONNECT_TIMEOUT") ||
    causeCode === "UND_ERR_CONNECT_TIMEOUT"
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = AGGREGATOR_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function saveMemoryToWalrus(
  memory: Memory,
  network: SuiNetwork = "testnet"
): Promise<string> {
  const publisherUrls = getSuiNetworkConfig(network).walrusPublisherUrls;
  const payload = Buffer.from(JSON.stringify(memory), "utf8");
  let lastError: Error | null = null;

  for (const publisherUrl of publisherUrls) {
    try {
      console.info("[walrus] trying publisher", { network, publisherUrl });
      const response = await fetchWithTimeout(
        `${publisherUrl}/v1/blobs?permanent=true`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: payload
        },
        PUBLISHER_TIMEOUT_MS
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new WalrusError(`Publisher failed: HTTP ${response.status} ${body.slice(0, 120)}`);
      }

      const blobId = extractBlobId(await response.json());
      console.info("[walrus] publisher success", { network });
      return blobId;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (isNetworkTimeout(error)) {
        console.warn("[walrus] publisher timeout", {
          network,
          publisherUrl,
          timeoutMs: PUBLISHER_TIMEOUT_MS
        });
      } else {
        console.warn("[walrus] publisher failed, trying next", {
          network,
          publisherUrl,
          error: lastError.message
        });
      }
    }
  }

  throw new WalrusError(`All Walrus publishers failed: ${lastError?.message ?? "unknown error"}`);
}

export async function loadMemoryFromWalrus(
  blobId: string,
  network: SuiNetwork = "testnet"
): Promise<Memory> {
  const aggregatorUrls = getSuiNetworkConfig(network).walrusAggregatorUrls;
  let lastError: Error | null = null;

  for (const aggregatorUrl of aggregatorUrls) {
    const url = `${aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`;
    console.info("[walrus] trying aggregator", {
      network,
      aggregatorUrl,
      blobId: truncateBlobId(blobId),
      timeoutMs: AGGREGATOR_TIMEOUT_MS
    });

    try {
      const response = await fetchWithTimeout(url, {}, AGGREGATOR_TIMEOUT_MS);

      if (!response.ok) {
        throw new WalrusError(`Aggregator failed: HTTP ${response.status}`);
      }

      try {
        const buffer = await response.arrayBuffer();
        const text = new TextDecoder().decode(buffer);
        const memory = validateMemory(JSON.parse(text));
        console.info("[walrus] load success", { network, aggregatorUrl, blobId: truncateBlobId(blobId) });
        return memory;
      } catch {
        throw new WalrusError("Walrus blob is not a valid Memory object");
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (isNetworkTimeout(error)) {
        console.warn("[walrus] timeout", {
          network,
          aggregatorUrl,
          blobId: truncateBlobId(blobId),
          timeoutMs: AGGREGATOR_TIMEOUT_MS
        });
      } else {
        console.warn("[walrus] aggregator failed", {
          network,
          aggregatorUrl,
          blobId: truncateBlobId(blobId),
          error: lastError.message
        });
      }
    }
  }

  const error = new WalrusError(`All Walrus aggregators failed: ${lastError?.message ?? "unknown error"}`);
  (error as WalrusError & { isNetworkFailure: boolean }).isNetworkFailure = true;
  throw error;
}
