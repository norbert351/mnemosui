export interface WalrusUploadResult {
  blobId: string
  blobObject: {
    id: string
    storage: {
      id: string
      start_epoch: number
      end_epoch: number
      storage_size: number
    }
    blob_id: string
    blob_size: number
    deletable: boolean
    erasure_code_type: string
    encoding_type: string
    certified_epoch: number | null
  }
  endEpoch: number
}

export interface WalrusReadResult {
  blobId: string
  data: string
}

export type UploadStatus = 'idle' | 'creating_storage' | 'registering' | 'uploading' | 'certifying' | 'success' | 'error'

export interface WalrusSigner {
  toSuiAddress(): string
  signAndExecuteTransaction(input: {
    transaction: any
    client?: any
  }): Promise<{
    Transaction?: { digest: string; effects: any }
    FailedTransaction?: { digest: string; status: { error?: { message: string } } }
  }>
}
