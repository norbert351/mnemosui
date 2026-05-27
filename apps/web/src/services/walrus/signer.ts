import { Signer } from '@mysten/sui/cryptography'
import type { PublicKey } from '@mysten/sui/cryptography'
import type { WalrusSigner } from './types'

export class WalletSigner extends Signer {
  readonly #address: string
  readonly #walletSignAndExecute: (input: { transaction: any }) => Promise<{ digest: string }>
  readonly #suiClient: any

  constructor(
    address: string,
    signAndExecuteTransaction: (input: { transaction: any }) => Promise<{ digest: string }>,
    suiClient: any,
  ) {
    super()
    this.#address = address
    this.#walletSignAndExecute = signAndExecuteTransaction
    this.#suiClient = suiClient
  }

  toSuiAddress(): string {
    return this.#address
  }

  async sign(bytes: Uint8Array): Promise<Uint8Array> {
    throw new Error('Direct signing not supported. Use signAndExecuteTransaction instead.')
  }

  getKeyScheme(): 'ED25519' {
    return 'ED25519'
  }

  getPublicKey(): PublicKey {
    throw new Error('Public key not available from wallet signer.')
  }

  override async signAndExecuteTransaction(input: { transaction: any; client?: any }): Promise<any> {
    const { transaction } = input
    try {
      const result = await this.#walletSignAndExecute({ transaction })
      const txRes = await this.#suiClient.core.waitForTransaction({
        digest: result.digest,
        options: { showEffects: true },
      })
      return {
        Transaction: {
          digest: result.digest,
          effects: txRes.effects ?? txRes,
        },
      }
    } catch (error: any) {
      return {
        FailedTransaction: {
          digest: '',
          status: { error: { message: error?.message ?? 'Transaction failed' } },
        },
      }
    }
  }
}

export function createWalrusSigner(
  address: string,
  signAndExecuteTransaction: (input: { transaction: any }) => Promise<{ digest: string }>,
  suiClient: any,
): WalrusSigner {
  return new WalletSigner(address, signAndExecuteTransaction, suiClient)
}
