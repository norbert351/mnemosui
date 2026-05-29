import { WalrusClient } from '@mysten/walrus'
import type { SuiNetwork } from '../../lib/network'

export type WalrusNetwork = SuiNetwork

export function getRelayHost(network: WalrusNetwork): string {
  return network === 'mainnet'
    ? 'https://upload-relay.mainnet.walrus.space'
    : 'https://upload-relay.testnet.walrus.space'
}

export function createWalrusClient(network: WalrusNetwork, suiClient: any) {
  return new WalrusClient({
    network,
    suiClient,
    uploadRelay: {
      host: getRelayHost(network),
      timeout: 120_000,
      sendTip: { max: 10_000_000_000 },
    },
  })
}
