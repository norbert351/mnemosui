import type { SuiNetwork } from './network'
import { getScopedStorageKey } from './network'

export function networkKey(
  network: SuiNetwork,
  key: string,
) {
  return `mnemosui-${network}-${key}`
}

export function scopedKey(
  network: SuiNetwork,
  walletAddress: string,
  key: string,
): string {
  return getScopedStorageKey(network, walletAddress, key)
}
