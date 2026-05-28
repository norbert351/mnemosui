import { getSuiNetworkConfig, truncateWalletAddress, type SuiNetwork } from "./network";
import type { HistoryResult, JsonRpcRequest, JsonRpcResponse } from "../types";

interface CacheEntry {
  result: unknown;
  expiresAt: number;
}

const rpcCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function getCacheKey(network: SuiNetwork, walletAddress: string, method: string): string {
  return `${network}::${walletAddress.toLowerCase()}::${method}`;
}

function getCached(key: string): unknown | null {
  const entry = rpcCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    rpcCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: unknown): void {
  rpcCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export class TatumError extends Error {
  public readonly statusCode = 502;
  public readonly code = "TATUM_REQUEST_FAILED";

  public constructor(message = "Tatum RPC request failed") {
    super(message);
    this.name = "TatumError";
  }
}

let requestId = 1;

function getRequiredApiKey(): string {
  const value = process.env.TATUM_API_KEY;
  if (!value || value.includes("your_tatum_api_key_here")) {
    throw new TatumError("TATUM_API_KEY is not configured");
  }
  return value;
}

async function callSuiRpc(
  network: SuiNetwork,
  method: string,
  params: unknown[]
): Promise<unknown> {
  const rpcUrl = getSuiNetworkConfig(network).rpcUrl;
  const apiKey = getRequiredApiKey();

  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: requestId++,
    method,
    params,
  };

  console.info("[tatum] rpc request", { network, method });

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[tatum] rpc HTTP failed", {
      network,
      method,
      status: response.status,
    });
    throw new TatumError(
      `Tatum RPC ${method} failed with HTTP ${response.status}: ${body.slice(0, 160)}`
    );
  }

  const payload = (await response.json()) as JsonRpcResponse;

  if ("error" in payload) {
    console.error("[tatum] rpc error", { network, method, error: payload.error });
    throw new TatumError(
      `Tatum RPC error in ${method}: ${JSON.stringify(payload.error)}`
    );
  }

  console.info("[tatum] rpc success", { network, method });
  return payload.result;
}

function emptyHistory(): HistoryResult {
  return { sent: { data: [] }, received: { data: [] } };
}

export async function getWalletTransactionHistory(
  walletAddress: string,
  limit: number,
  network: SuiNetwork = "testnet"
): Promise<HistoryResult> {
  const options = {
    showInput: true,
    showEffects: true,
    showEvents: true,
    showBalanceChanges: true,
  };

  const cacheKey = getCacheKey(network, walletAddress, "suix_queryTransactionBlocks");
  const cached = getCached(cacheKey);
  if (cached !== null) {
    console.info("[tatum] cache hit", { network, method: "suix_queryTransactionBlocks" });
    return cached as HistoryResult;
  }
  console.info("[tatum] cache miss", { network, method: "suix_queryTransactionBlocks" });

  const [sentResult, receivedResult] = await Promise.allSettled([
    callSuiRpc(network, "suix_queryTransactionBlocks", [
      { filter: { FromAddress: walletAddress }, options },
      null,
      limit,
      true,
    ]),
    callSuiRpc(network, "suix_queryTransactionBlocks", [
      { filter: { ToAddress: walletAddress }, options },
      null,
      limit,
      true,
    ]),
  ]);

  if (sentResult.status === "rejected") {
    console.warn("[tatum] sent tx fetch failed", {
      network,
      error: sentResult.reason instanceof Error ? sentResult.reason.message : String(sentResult.reason),
    });
  }
  if (receivedResult.status === "rejected") {
    console.warn("[tatum] received tx fetch failed", {
      network,
      error: receivedResult.reason instanceof Error ? receivedResult.reason.message : String(receivedResult.reason),
    });
  }

  if (sentResult.status === "rejected" && receivedResult.status === "rejected") {
    return emptyHistory();
  }

  const result: HistoryResult = {
    sent: sentResult.status === "fulfilled" ? sentResult.value : { data: [] },
    received:
      receivedResult.status === "fulfilled" ? receivedResult.value : { data: [] },
  };

  setCache(cacheKey, result);
  return result;
}

export async function getWalletBalances(
  walletAddress: string,
  network: SuiNetwork = "testnet"
): Promise<unknown> {
  const cacheKey = getCacheKey(network, walletAddress, "suix_getAllBalances");
  const cached = getCached(cacheKey);
  if (cached !== null) {
    console.info("[tatum] cache hit", { network, method: "suix_getAllBalances" });
    return cached;
  }
  console.info("[tatum] cache miss", { network, method: "suix_getAllBalances" });

  try {
    const result = await callSuiRpc(network, "suix_getAllBalances", [walletAddress]);
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[tatum] balances fetch failed", {
      network,
      walletAddress: truncateWalletAddress(walletAddress),
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getWalletOwnedObjects(
  walletAddress: string,
  cursor: string | null,
  limit: number,
  network: SuiNetwork = "testnet"
): Promise<unknown> {
  return callSuiRpc(network, "suix_getOwnedObjects", [
    walletAddress,
    {
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
        showDisplay: true,
      },
    },
    cursor,
    limit,
  ]);
}
