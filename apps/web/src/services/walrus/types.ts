import type { Signer } from '@mysten/sui/cryptography'

export type WalrusSigner = Signer

export interface WalrusUploadResult {
  blobId: string
  blobObject: {
    id: string
    registered_epoch: number
    blob_id: string
    size: string
    encoding_type: number
    certified_epoch: number | null
    storage: {
      id: string
      start_epoch: number
      end_epoch: number
      storage_size: string
    }
    deletable: boolean
  }
  endEpoch: number
}

export interface WalrusReadResult {
  blobId: string
  data: string
}

export type UploadStatus = 'idle' | 'creating_storage' | 'registering' | 'uploading' | 'certifying' | 'success' | 'error'
