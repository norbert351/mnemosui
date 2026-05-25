export type SuiNetwork = "testnet" | "mainnet";

export interface SuiNetworkConfig {
  rpcUrl: string;
  walrusPublisherUrls: string[];
  walrusAggregatorUrls: string[];
}

export const DEFAULT_SUI_NETWORK: SuiNetwork = "testnet";

const TESTNET_RPC_URL = "https://sui-testnet.gateway.tatum.io";
const MAINNET_RPC_URL = "https://sui-mainnet.gateway.tatum.io";

const TESTNET_PUBLISHER_URLS = [
  "https://publisher.walrus-testnet.walrus.space",
  "https://walrus-testnet-publisher.bartestnet.com",
];

const TESTNET_AGGREGATOR_URLS = [
  "https://aggregator.walrus-testnet.walrus.space",
  "https://walrus-testnet-aggregator.bartestnet.com",
  "https://sui-walrus-testnet.bwarelabs.com/aggregator",
];

const MAINNET_PUBLISHER_URLS = [
  "https://publisher.walrus.space",
];

const MAINNET_AGGREGATOR_URLS = [
  "https://aggregator.walrus.space",
];

function cleanUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}

function uniqueUrls(urls: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const url of urls) {
    const normalized = cleanUrl(url);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function normalizeSuiNetwork(value: unknown): SuiNetwork {
  if (typeof value !== "string") {
    return DEFAULT_SUI_NETWORK;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "mainnet" ? "mainnet" : "testnet";
}

export function getSuiNetworkFromHeader(value: unknown): SuiNetwork {
  if (Array.isArray(value)) {
    return normalizeSuiNetwork(value[0]);
  }

  return normalizeSuiNetwork(value);
}

export function getSuiNetworkConfig(network: SuiNetwork): SuiNetworkConfig {
  if (network === "mainnet") {
    return {
      rpcUrl: cleanUrl(process.env.TATUM_MAINNET_RPC_URL) ?? MAINNET_RPC_URL,
      walrusPublisherUrls: uniqueUrls([
        process.env.WALRUS_MAINNET_PUBLISHER_URL,
        ...MAINNET_PUBLISHER_URLS,
      ]),
      walrusAggregatorUrls: uniqueUrls([
        process.env.WALRUS_MAINNET_AGGREGATOR_URL,
        ...MAINNET_AGGREGATOR_URLS,
      ]),
    };
  }

  return {
    rpcUrl: cleanUrl(process.env.TATUM_TESTNET_RPC_URL) ?? cleanUrl(process.env.TATUM_RPC_URL) ?? TESTNET_RPC_URL,
    walrusPublisherUrls: uniqueUrls([
      process.env.WALRUS_TESTNET_PUBLISHER_URL,
      process.env.WALRUS_PUBLISHER_URL,
      ...TESTNET_PUBLISHER_URLS,
    ]),
    walrusAggregatorUrls: uniqueUrls([
      process.env.WALRUS_TESTNET_AGGREGATOR_URL,
      process.env.WALRUS_AGGREGATOR_URL,
      ...TESTNET_AGGREGATOR_URLS,
    ]),
  };
}

export function truncateWalletAddress(address: string | undefined | null): string | null {
  if (!address) {
    return null;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
