import { ALL_SUPPORTED_CHAIN_IDS, SupportedChainId } from '../constants/chains'

import { AbstractConnector } from '@web3-react/abstract-connector'
import { FortmaticConnector } from './Fortmatic'
import { InjectedConnector } from '@web3-react/injected-connector'
import { NetworkConnector } from './NetworkConnector'
import { PortisConnector } from '@web3-react/portis-connector'
import { SafeAppConnector } from '@gnosis.pm/safe-apps-web3-react'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { WalletLinkConnector } from '@web3-react/walletlink-connector'
import { Web3Provider } from '@ethersproject/providers'
import getLibrary from '../utils/getLibrary'

const INFURA_KEY = '0dc1a08777d746ff8af552d13ce42451'
const FORMATIC_KEY = process.env.REACT_APP_FORTMATIC_KEY
const PORTIS_ID = process.env.REACT_APP_PORTIS_ID
const WALLETCONNECT_BRIDGE_URL = process.env.REACT_APP_WALLETCONNECT_BRIDGE_URL

if (typeof INFURA_KEY === 'undefined') {
  throw new Error(`REACT_APP_INFURA_KEY must be a defined environment variable`)
}

const NETWORK_URLS: { [key in SupportedChainId]: string } = {
  [SupportedChainId.MAINNET]: `https://rpc.ankr.com/eth`,
  [SupportedChainId.RINKEBY]: `https://rinkeby-light.eth.linkpool.io`,
  [SupportedChainId.ROPSTEN]: `https://ropsten-light.eth.linkpool.io`,
  [SupportedChainId.GOERLI]: `https://goerli-light.eth.linkpool.io`,
  [SupportedChainId.KOVAN]: `https://kovan.poa.network`,
  [SupportedChainId.BINANCE]: `https://bsc-dataseed1.defibit.io`,
  [SupportedChainId.OPTIMISM]: `https://mainnet.optimism.io`,
  [SupportedChainId.OPTIMISTIC_KOVAN]: `https://kovan.optimism.io`,
  [SupportedChainId.ARBITRUM_ONE]: `https://rpc.ankr.com/arbitrum`,
  [SupportedChainId.ARBITRUM_RINKEBY]: `https://rinkeby.arbitrum.io/rpc`,
  [SupportedChainId.POLYGON]: `https://polygon-rpc.com`,
  [SupportedChainId.POLYGON_MUMBAI]: `https://rpc-mumbai.maticvigil.com`
}

export const network = new NetworkConnector({
  urls: NETWORK_URLS,
  defaultChainId: 1,
})

let networkLibrary: Web3Provider | undefined
export function getNetworkLibrary(): Web3Provider {
  return (networkLibrary = networkLibrary ?? getLibrary(network.provider))
}

export const injected = new InjectedConnector({
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
})

export const blockWalletConnector = {
  ...new InjectedConnector({supportedChainIds: ALL_SUPPORTED_CHAIN_IDS}),
  activate: async () => {
     await (window as any)?.ethereum?.request({ method: 'eth_requestAccounts' }).catch((error: any) => {
      if (error.code === 4001) {
        // See: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md#provider-errors
        console.log('Connection rejected.');
      } else {
        console.error(error);
      }
    });
  },
  deactivate: () => {
    // Runs only they are brand new, or have hit the disconnect button
     (window?.ethereum as any)?.request({
      method: "wallet_requestPermissions",
      params: [
        {
          eth_accounts: {}
        }
      ]
    });
  }
} 

export const gnosisSafe = new SafeAppConnector()

export const walletconnect = new WalletConnectConnector({
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
  rpc: NETWORK_URLS,
  bridge: WALLETCONNECT_BRIDGE_URL,
  qrcode: true,
  pollingInterval: 15000,
  //infuraId: INFURA_KEY,
})


// mainnet only
export const fortmatic = new FortmaticConnector({
  apiKey: 'pk_live_3AB348AFABA8C48D' ?? '',
  chainId: 1,
})

// mainnet only
export const portis = new PortisConnector({
  dAppId: PORTIS_ID ?? '',
  networks: [1],
})

export const UNISWAP_LOGO_URL = 'https://kibainu.com/static/media/download.e893807d.png'

// mainnet only
export const walletlink = new WalletLinkConnector({
  supportedChainIds: ALL_SUPPORTED_CHAIN_IDS,
  url: NETWORK_URLS[SupportedChainId.MAINNET],
  appName: 'KibaSwap',
  appLogoUrl: UNISWAP_LOGO_URL,
})
