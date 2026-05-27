import type { WalrusSigner } from './types'

export function createWalrusSigner(
  address: string,
  signAndExecuteTransaction: (input: { transaction: any }) => Promise<{ digest: string }>,
  suiClient: any,
): WalrusSigner {
  return {
    toSuiAddress: () => address,
    signAndExecuteTransaction: async (input: { transaction: any }) => {
      try {
        const result = await signAndExecuteTransaction({ transaction: input.transaction })
        const txRes = await suiClient.core.waitForTransaction({
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
    },
  }
}
