import type {
  ChatMessage,
  ChatRequestBody,
  Memory,
  MemoryType,
  SaveMemoryRequestBody,
  SummarizeRequestBody,
  WalletHistoryRequestBody,
  WalletObjectsRequestBody,
  WalletRequestBody
} from "./types";

export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code = "VALIDATION_ERROR";

  public constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const SUI_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/;
const BLOB_ID_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;
const MEMORY_TYPES = new Set<MemoryType>([
  "trade_thesis",
  "portfolio_snapshot",
  "research_note",
  "tx_summary",
  "dao_vote",
  "nft_event",
  "manual_note",
  "decision"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ValidationError(`${name} must be an object`);
  }

  return value;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${name} must be a non-empty string`);
  }

  return value;
}

function requireStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ValidationError(`${name} must be an array of strings`);
  }

  return value;
}

function requireStringValue(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${name} must be a string`);
  }

  return value;
}

function requireIsoDate(value: unknown, name: string): string {
  const date = requireString(value, name);

  if (Number.isNaN(Date.parse(date))) {
    throw new ValidationError(`${name} must be a valid date string`);
  }

  return date;
}

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requireString(value, name);
}

function optionalMemorySource(value: unknown): "manual" | "ai_decision" | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const source = requireString(value, "memory.source");
  if (source !== "manual" && source !== "ai_decision") {
    throw new ValidationError("memory.source must be manual or ai_decision");
  }

  return source;
}

function optionalMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireRecord(value, "memory.metadata");
}

function validateMemoryType(value: unknown): MemoryType {
  if (value === undefined) {
    return "manual_note";
  }

  const type = requireString(value, "memory.type");
  if (!MEMORY_TYPES.has(type as MemoryType)) {
    throw new ValidationError("memory.type must be a supported memory type");
  }

  return type as MemoryType;
}

function validateSaved(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (typeof value !== "boolean") {
    throw new ValidationError("memory.saved must be a boolean");
  }

  return value;
}

export function validateWalletAddress(value: unknown): string {
  const walletAddress = requireString(value, "walletAddress");

  if (!SUI_ADDRESS_PATTERN.test(walletAddress)) {
    throw new ValidationError("walletAddress must be a Sui address");
  }

  return walletAddress.toLowerCase();
}

export function validateBlobId(value: unknown): string {
  const blobId = requireString(value, "blobId");

  if (!BLOB_ID_PATTERN.test(blobId)) {
    throw new ValidationError("blobId must be a URL-safe Walrus blob ID");
  }

  return blobId;
}

export function validateLimit(value: unknown, defaultLimit: number): number {
  if (value === undefined) {
    return defaultLimit;
  }

  if (!Number.isInteger(value) || typeof value !== "number" || value < 1 || value > 50) {
    throw new ValidationError("limit must be an integer between 1 and 50");
  }

  return value;
}

export function validateMemory(value: unknown): Memory {
  const body = requireRecord(value, "memory");
  const walletAddress = validateWalletAddress(body.walletAddress);
  const tags = requireStringArray(body.tags, "memory.tags");
  const txDigest = optionalString(body.txDigest, "memory.txDigest");
  const source = optionalMemorySource(body.source);
  const metadata = optionalMetadata(body.metadata);
  const blobId = body.blobId === undefined ? undefined : validateBlobId(body.blobId);

  return {
    id: requireString(body.id, "memory.id"),
    walletAddress,
    type: validateMemoryType(body.type),
    title: requireString(body.title, "memory.title"),
    content: requireString(body.content, "memory.content"),
    summary: requireStringValue(body.summary, "memory.summary"),
    tags,
    ...(txDigest ? { txDigest } : {}),
    ...(source ? { source } : {}),
    ...(metadata ? { metadata } : {}),
    ...(blobId ? { blobId } : {}),
    saved: validateSaved(body.saved),
    createdAt: requireIsoDate(body.createdAt, "memory.createdAt"),
    updatedAt: requireIsoDate(body.updatedAt, "memory.updatedAt")
  };
}

function validateChatMessage(value: unknown, index: number): ChatMessage {
  const message = requireRecord(value, `messages[${index}]`);
  const role = requireString(message.role, `messages[${index}].role`);

  if (role !== "user" && role !== "assistant") {
    throw new ValidationError(`messages[${index}].role must be user or assistant`);
  }

  return {
    role,
    content: requireString(message.content, `messages[${index}].content`)
  };
}

export function validateChatRequestBody(value: unknown): ChatRequestBody {
  const body = requireRecord(value, "body");
  const walletAddress =
    body.walletAddress === undefined ? undefined : validateWalletAddress(body.walletAddress);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ValidationError("messages must be a non-empty array");
  }

  if (body.memories !== undefined && !Array.isArray(body.memories)) {
    throw new ValidationError("memories must be an array");
  }

  return {
    walletAddress,
    memories: Array.isArray(body.memories)
      ? body.memories.map((memory) => validateMemory(memory))
      : [],
    messages: body.messages.map((message, index) => validateChatMessage(message, index)),
    balances: body.balances
  };
}

export function validateSummarizeRequestBody(value: unknown): SummarizeRequestBody {
  const body = requireRecord(value, "body");

  return {
    content: requireString(body.content, "content")
  };
}

export function validateSaveMemoryRequestBody(value: unknown): SaveMemoryRequestBody {
  const body = requireRecord(value, "body");

  return {
    memory: validateMemory(body.memory)
  };
}

export function validateWalletRequestBody(value: unknown): WalletRequestBody {
  const body = requireRecord(value, "body");

  return {
    walletAddress: validateWalletAddress(body.walletAddress)
  };
}

export function validateWalletHistoryRequestBody(value: unknown): WalletHistoryRequestBody {
  const body = requireRecord(value, "body");

  return {
    walletAddress: validateWalletAddress(body.walletAddress),
    limit: validateLimit(body.limit, 20)
  };
}

export function validateWalletObjectsRequestBody(value: unknown): WalletObjectsRequestBody {
  const body = requireRecord(value, "body");
  const cursor = body.cursor;

  if (cursor !== undefined && cursor !== null && typeof cursor !== "string") {
    throw new ValidationError("cursor must be a string or null");
  }

  return {
    walletAddress: validateWalletAddress(body.walletAddress),
    cursor: cursor === undefined ? null : cursor,
    limit: validateLimit(body.limit, 20)
  };
}
