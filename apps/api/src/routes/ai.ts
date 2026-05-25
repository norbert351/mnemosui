import { Router } from "express";
import { streamChatCompletion, summarizeMemory } from "../lib/anthropic";
import { truncateWalletAddress } from "../lib/network";
import { validateChatRequestBody, validateSummarizeRequestBody } from "../validate";

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeCoinType(value: unknown): string | undefined {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }

  const parts = raw.split("::");
  return parts[parts.length - 1] ?? raw;
}

function formatBalance(raw?: string) {
  const value = Number(raw ?? "0");

  // Convert MIST -> SUI.
  return (value / 1_000_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 4
  });
}

function describeBalanceEntry(entry: unknown, index: number): string | null {
  if (!isRecord(entry)) {
    return null;
  }

  const asset =
    normalizeCoinType(entry.coinType) ??
    normalizeCoinType(entry.coin_type) ??
    asString(entry.symbol) ??
    asString(entry.assetType) ??
    `Balance ${index + 1}`;

  const balance =
    asString(entry.totalBalance) ??
    asString(entry.total_balance) ??
    asString(entry.balance) ??
    asString(entry.amount);

  const lockedBalance = asString(entry.lockedBalance) ?? asString(entry.locked_balance);

  const details: string[] = [];
  if (balance) {
    details.push(formatBalance(balance));
  }
  if (lockedBalance && lockedBalance !== "0") {
    details.push(`locked ${formatBalance(lockedBalance)}`);
  }

  return details.length > 0 ? `${asset}: ${details.join(", ")}` : asset;
}

function buildBalanceContext(balances: unknown): string {
  const entries = Array.isArray(balances)
    ? balances
    : isRecord(balances) && Array.isArray(balances.result)
      ? balances.result
      : [];

  if (entries.length === 0) {
    return "Wallet balances: none loaded.";
  }

  const visibleEntries = entries.slice(0, 6);
  const balanceLines = visibleEntries
    .map((entry, index) => describeBalanceEntry(entry, index))
    .filter((line): line is string => Boolean(line));
  const hiddenCount = entries.length - visibleEntries.length;

  return [
    "Wallet balances:",
    ...balanceLines.map((line, index) => `${index + 1}. ${line}`),
    hiddenCount > 0 ? `... ${hiddenCount} more balance entries omitted.` : ""
  ].filter(Boolean).join("\n");
}

function buildMemoryContext(
  walletAddress: string | undefined,
  memories: ReturnType<typeof validateChatRequestBody>["memories"],
  balances: unknown
): string {
  const normalizedWalletAddress = walletAddress ?? "unknown wallet";
  const visibleMemories = (memories ?? []).slice(0, 8);
  const hiddenMemoryCount = Math.max(0, (memories?.length ?? 0) - visibleMemories.length);

  const memoryLines = visibleMemories.map((memory, index) => {
    const tags = memory.tags.length > 0 ? memory.tags.join(", ") : "untagged";
    const source = memory.source ?? "manual";
    const summary = truncate((memory.summary || memory.content).replace(/\s+/g, " ").trim(), 180);
    const content = truncate(memory.content.replace(/\s+/g, " ").trim(), 260);

    return [
      `Memory ${index + 1}`,
      `Type: ${memory.type}`,
      `Source: ${source}`,
      `Title: ${memory.title}`,
      `Summary: ${summary}`,
      `Content: ${content}`,
      `Tags: ${tags}`,
      `Created: ${memory.createdAt}`,
      `Updated: ${memory.updatedAt}`
    ].join("\n");
  });

  const prompt = [
    "You are MnemoSui, an AI crypto companion and permanent memory layer for a wallet.",
    "You specialize in the Sui ecosystem, Walrus-backed memory, wallet-aware decision journaling, and portfolio-aware crypto suggestions.",
    "You can also discuss all major crypto ecosystems: Bitcoin, Ethereum, Solana, Base, DeFi, NFTs, memecoins, and yield farming.",
    "Use the user's saved memories naturally. Reference memory titles, types, summaries, dates, and patterns in behavior when relevant.",
    "Use wallet balances as context for staking, LP positions, token buys, risk management, diversification, and position sizing.",
    "The user's historical decisions and behavior matter more than generic market commentary.",
    "Respond concisely with actionable suggestions, specific tradeoffs, and short reasoning.",
    "Avoid generic financial disclaimers, chatbot filler, academic tone, giant essays, and vague market commentary.",
    "Encourage saving important decisions so MnemoSui can recall the reasoning later.",
    "End useful responses with exactly one short follow-up question that encourages deeper memory usage.",
    "Generate a structured DECISION_CARD block when you recommend a buy, sell, stake, LP, hold, research, allocation, or risk-management decision.",
    "Do not append a DECISION_CARD for greetings, simple memory recalls, or non-actionable explanations.",
    "IMPORTANT RESPONSE RULES:",
    "- Never output XML tags",
    "- Never output <tool_call>",
    "- Never simulate function calling",
    "- Never pretend to call APIs",
    "- Never output raw JSON unless generating a DECISION_CARD",
    "- Respond like a normal conversational crypto AI assistant",
    "- Do not expose internal reasoning or tools",
    "- Never emit markdown code blocks unless explicitly requested",
    "DECISION_CARD format only:",
    "---",
    'DECISION_CARD:{"action":"buy","token":"SUI","allocation":"10%","risk":"medium","reason":"your one-line reason here","confidence":"medium"}',
    `Wallet address: ${normalizedWalletAddress}`,
    `Saved memories loaded: ${visibleMemories.length}${hiddenMemoryCount > 0 ? ` (showing ${visibleMemories.length} of ${memories?.length ?? 0})` : ""}`,
    memoryLines.length > 0 ? ["Saved memories:", ...memoryLines].join("\n\n") : "Saved memories: none loaded.",
    buildBalanceContext(balances)
  ];

  return prompt.join("\n\n");
}

router.post("/chat", async (req, res, next) => {
  try {
    const { walletAddress, balances, memories, messages } = validateChatRequestBody(req.body);
    const trimmedMessages =
      messages.length > 8
        ? messages.slice(-8)
        : messages;
    const abortController = new AbortController();
    let clientConnected = true;

    console.info("[api/ai] chat stream requested", {
      walletAddress: truncateWalletAddress(walletAddress),
      memoryCount: memories?.length ?? 0,
      hasBalances: Array.isArray(balances) ? balances.length > 0 : Boolean(balances),
      messageCount: messages.length,
      trimmedMessageCount: trimmedMessages.length
    });

    req.on("close", () => {
      clientConnected = false;
      abortController.abort();
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    await streamChatCompletion(
      trimmedMessages,
      (text) => {
        if (clientConnected) {
          res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
        }
      },
      abortController.signal,
      buildMemoryContext(walletAddress, memories, balances)
    );

    if (clientConnected) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "AI stream failed" })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
      return;
    }

    next(error);
  }
});

router.post("/summarize", async (req, res, next) => {
  try {
    const { content } = validateSummarizeRequestBody(req.body);
    console.info("[api/ai] summarize requested", { contentLength: content.length });
    const summary = await summarizeMemory(content);

    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

export default router;
