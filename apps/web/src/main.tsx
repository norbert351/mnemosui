import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import '@mysten/dapp-kit/dist/index.css'
import './index.css'
import App from './App'
import { getStoredSuiNetwork } from './lib/network'

const queryClient = new QueryClient()

const { networkConfig } = createNetworkConfig({
  testnet: { network: 'testnet', url: 'https://fullnode.testnet.sui.io:443' },
  mainnet: { network: 'mainnet', url: 'https://fullnode.mainnet.sui.io:443' },
})
const activeNetwork = getStoredSuiNetwork()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={activeNetwork}>
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
