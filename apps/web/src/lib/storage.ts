import type { SuiNetwork } from './network'

export function networkKey(
  network: SuiNetwork,
  key: string,
) {
  return `mnemosui-${network}-${key}`
}
