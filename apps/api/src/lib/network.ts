export type SuiNetwork = "testnet" | "mainnet";

export interface SuiNetworkConfig {
  rpcUrl: string;
}

export const DEFAULT_SUI_NETWORK: SuiNetwork = "testnet";

const TESTNET_RPC_URL = "https://sui-testnet.gateway.tatum.io";
const MAINNET_RPC_URL = "https://sui-mainnet.gateway.tatum.io";

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
      rpcUrl: process.env.TATUM_MAINNET_RPC_URL?.trim() ?? MAINNET_RPC_URL,
    };
  }

  return {
    rpcUrl: process.env.TATUM_TESTNET_RPC_URL?.trim() ?? process.env.TATUM_RPC_URL?.trim() ?? TESTNET_RPC_URL,
  };
}

export function truncateWalletAddress(address: string | undefined | null): string | null {
  if (!address) {
    return null;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
