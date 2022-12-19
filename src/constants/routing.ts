import {
  AMPL,
  DAI,
  DAI_OPTIMISM,
  ETH2X_FLI,
  ExtendedEther,
  FEI,
  FRAX,
  FXS,
  TRIBE,
  USDC,
  USDT,
  USDT_OPTIMISM,
  WBTC,
  WBTC_OPTIMISM,
  WETH9_EXTENDED,
  renBTC,
  BASE_TOKENS,
} from './tokens'
// a list of tokens by chain
import { Currency, Token } from '@uniswap/sdk-core'

import { SupportedChainId } from './chains'
import { binanceTokens } from 'utils/binance.tokens'
import JSBI from 'jsbi'
import { BinanceNativeCurrency } from 'hooks/Shorthands'

type ChainTokenList = {
  readonly [chainId: number]: Token[]
}

type ChainCurrencyList = {
  readonly [chainId: number]: Currency[]
}

const WETH_ONLY: ChainTokenList = Object.fromEntries(
  Object.entries(WETH9_EXTENDED).map(([key, value]) => [key, [value]])
)

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [SupportedChainId.MAINNET]: [...WETH_ONLY[SupportedChainId.MAINNET], DAI, USDC, USDT, WBTC],
  [SupportedChainId.OPTIMISM]: [...WETH_ONLY[SupportedChainId.OPTIMISM], DAI_OPTIMISM, USDT_OPTIMISM, WBTC_OPTIMISM],
  [SupportedChainId.BINANCE]: [...WETH_ONLY[SupportedChainId.BINANCE],
  BASE_TOKENS[SupportedChainId.BINANCE].CAKE,
  BASE_TOKENS[SupportedChainId.BINANCE].BUSD,
  BASE_TOKENS[SupportedChainId.BINANCE].USDT,
  BASE_TOKENS[SupportedChainId.BINANCE].BTCB,
  BASE_TOKENS[SupportedChainId.BINANCE].UST,
  BASE_TOKENS[SupportedChainId.BINANCE].ETH,
  ],

}
export const ADDITIONAL_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [SupportedChainId.MAINNET]: {
    '0xF16E4d813f4DcfDe4c5b44f305c908742De84eF0': [ETH2X_FLI],
    [FEI.address]: [TRIBE],
    [TRIBE.address]: [FEI],
    [FRAX.address]: [FXS],
    [FXS.address]: [FRAX],
    [WBTC.address]: [renBTC],
    [renBTC.address]: [WBTC],
  },
}
/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [SupportedChainId.MAINNET]: {
    [AMPL.address]: [DAI, WETH9_EXTENDED[SupportedChainId.MAINNET]],
  },
}

/**
 * Shows up in the currency select for swap and add liquidity
 */
export const COMMON_BASES: ChainCurrencyList = {
  [SupportedChainId.MAINNET]: [
    new Token(SupportedChainId.MAINNET, '0x005d1123878fc55fbd56b54c73963b234a64af3c', 18, 'KIBA', 'Kiba Inu'),
    ExtendedEther.onChain(SupportedChainId.MAINNET),
    DAI,
    USDC,
    USDT,
    WBTC,
    WETH9_EXTENDED[SupportedChainId.MAINNET],
  ],
  [SupportedChainId.ROPSTEN]: [
    ExtendedEther.onChain(SupportedChainId.ROPSTEN),
    WETH9_EXTENDED[SupportedChainId.ROPSTEN],
  ],
  [SupportedChainId.RINKEBY]: [
    ExtendedEther.onChain(SupportedChainId.RINKEBY),
    WETH9_EXTENDED[SupportedChainId.RINKEBY],
  ],
  [SupportedChainId.BINANCE]: [
    new Token(SupportedChainId.BINANCE, '0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5', 18, 'KIBA', 'Kiba Inu'),
    WETH9_EXTENDED[SupportedChainId.BINANCE],
    binanceTokens.busd,
    binanceTokens.dai,
    binanceTokens.eth,
    binanceTokens.usdc,
    binanceTokens.usdt
  ],
  [SupportedChainId.GOERLI]: [ExtendedEther.onChain(SupportedChainId.GOERLI), WETH9_EXTENDED[SupportedChainId.GOERLI]],
  [SupportedChainId.KOVAN]: [ExtendedEther.onChain(SupportedChainId.KOVAN), WETH9_EXTENDED[SupportedChainId.KOVAN]],
  [SupportedChainId.ARBITRUM_ONE]: [
    ExtendedEther.onChain(SupportedChainId.ARBITRUM_ONE),
    WETH9_EXTENDED[SupportedChainId.ARBITRUM_ONE],
  ],
  [SupportedChainId.ARBITRUM_RINKEBY]: [
    ExtendedEther.onChain(SupportedChainId.ARBITRUM_RINKEBY),
    WETH9_EXTENDED[SupportedChainId.ARBITRUM_RINKEBY],
  ],
  [SupportedChainId.OPTIMISM]: [ExtendedEther.onChain(SupportedChainId.OPTIMISM)],
  [SupportedChainId.OPTIMISTIC_KOVAN]: [ExtendedEther.onChain(SupportedChainId.OPTIMISTIC_KOVAN)],
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [SupportedChainId.MAINNET]: [...WETH_ONLY[SupportedChainId.MAINNET], DAI, USDC, USDT, WBTC],
}
export const PINNED_PAIRS: { readonly [chainId: number]: [Token, Token][] } = {
  [SupportedChainId.MAINNET]: [
    [
      new Token(SupportedChainId.MAINNET, '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', 8, 'cDAI', 'Compound Dai'),
      new Token(
        SupportedChainId.MAINNET,
        '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
        8,
        'cUSDC',
        'Compound USD Coin'
      ),
    ],
    [USDC, USDT],
    [DAI, USDT],
  ],
}

export const FEES_NUMERATORS: {
  [chainId: number]: JSBI;
} = {
  [SupportedChainId.BINANCE]: JSBI.BigInt(9975),
  [SupportedChainId.MAINNET]: JSBI.BigInt(997),
  [SupportedChainId.ARBITRUM_ONE]: JSBI.BigInt(997),
};

export const FEES_DENOMINATORS: {
  [chainId: number]: JSBI;
} = {
  [SupportedChainId.BINANCE]: JSBI.BigInt(10000),
  [SupportedChainId.MAINNET]: JSBI.BigInt(1000),
  [SupportedChainId.ARBITRUM_ONE]: JSBI.BigInt(1000),
};