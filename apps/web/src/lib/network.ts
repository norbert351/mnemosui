export type SuiNetwork = 'testnet' | 'mainnet'

export interface NetworkConfig {
  label: string
  aggregatorUrl: string
  explorerBaseUrl: string
  badgeColor: string
}

export const NETWORK_STORAGE_KEY = 'mnemosui_sui_network'
export const NETWORK_SWITCH_TOAST_KEY = 'mnemosui_network_switch_toast'
export const DEFAULT_SUI_NETWORK: SuiNetwork = 'testnet'

export const NETWORK_CONFIGS: Record<SuiNetwork, NetworkConfig> = {
  testnet: {
    label: 'TESTNET',
    aggregatorUrl: 'https://aggregator.walrus-testnet.walrus.space',
    explorerBaseUrl: 'https://suiscan.xyz/testnet',
    badgeColor: 'var(--accent-amber)',
  },
  mainnet: {
    label: 'MAINNET',
    aggregatorUrl: 'https://aggregator.walrus.space',
    explorerBaseUrl: 'https://suiscan.xyz/mainnet',
    badgeColor: 'var(--accent-teal)',
  },
}

export function normalizeSuiNetwork(value: unknown): SuiNetwork {
  return value === 'mainnet' ? 'mainnet' : DEFAULT_SUI_NETWORK
}

export function getStoredSuiNetwork(): SuiNetwork {
  if (typeof window === 'undefined') {
    return DEFAULT_SUI_NETWORK
  }

  return normalizeSuiNetwork(localStorage.getItem(NETWORK_STORAGE_KEY))
}

export function setStoredSuiNetwork(network: SuiNetwork) {
  localStorage.setItem(NETWORK_STORAGE_KEY, network)
}

export function networkHeader(network: SuiNetwork = getStoredSuiNetwork()): Record<'x-sui-network', SuiNetwork> {
  return { 'x-sui-network': network }
}

export function networkLabel(network: SuiNetwork): string {
  return NETWORK_CONFIGS[network].label
}

export function networkBadgeColor(network: SuiNetwork): string {
  return NETWORK_CONFIGS[network].badgeColor
}

export function getScopedStorageKey(network: SuiNetwork, walletAddress: string, key: string): string {
  return `${key}:${network}:${walletAddress.toLowerCase()}`
}
