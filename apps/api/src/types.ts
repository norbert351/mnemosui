import type { Request } from "express";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type MemoryType =
  | "trade_thesis"
  | "portfolio_snapshot"
  | "research_note"
  | "tx_summary"
  | "dao_vote"
  | "nft_event"
  | "manual_note"
  | "decision";

export interface Memory {
  id: string;
  walletAddress: string;
  type: MemoryType;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  txDigest?: string;
  source?: "manual" | "ai_decision";
  metadata?: Record<string, unknown>;
  blobId?: string;
  saved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequestBody {
  walletAddress?: string;
  memories?: Memory[];
  messages: ChatMessage[];
  balances?: unknown;
}

export interface SummarizeRequestBody {
  content: string;
}

export interface SaveMemoryRequestBody {
  memory: Memory;
}

export interface WalletRequestBody {
  walletAddress: string;
}

export interface WalletHistoryRequestBody extends WalletRequestBody {
  limit?: number;
}

export interface WalletObjectsRequestBody extends WalletRequestBody {
  cursor?: string | null;
  limit?: number;
}

export interface WalrusNewlyCreatedResponse {
  newlyCreated: {
    blobObject: {
      blobId: string;
    };
  };
}

export interface WalrusAlreadyCertifiedResponse {
  alreadyCertified: {
    blobId: string;
  };
}

export type WalrusStoreResponse =
  | WalrusNewlyCreatedResponse
  | WalrusAlreadyCertifiedResponse;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
}

export interface JsonRpcSuccessResponse {
  jsonrpc: string;
  id: number;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: string;
  id: number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface HistoryResult {
  sent: unknown;
  received: unknown;
}

export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
  };
}

export type TypedRequest<TBody> = Request<Record<string, string>, unknown, TBody>;
