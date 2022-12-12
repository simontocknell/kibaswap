import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

import { abi as IPancakePairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { computePairAddress, Pair } from 'custom-uniswap-v2-sdk'
import { useActiveWeb3React } from './web3'
import { useMemo } from 'react'
import { useMultipleContractSingleData } from '../state/multicall/hooks'
import { wrappedCurrency } from 'utils/binance.utils'
import { INIT_CODE_HASHES, V2_FACTORY_ADDRESSES } from 'constants/addresses'
import { FEES_DENOMINATORS, FEES_NUMERATORS } from 'constants/routing'

const PAIR_INTERFACE = new Interface(IPancakePairABI)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export function usePairs(currencies: [Currency | undefined, Currency | undefined][]): [PairState, Pair | null][] {
  const { chainId } = useActiveWeb3React()

  const tokens = useMemo(
    () =>
      currencies.map(([currencyA, currencyB]) => [
        wrappedCurrency(currencyA, chainId),
        wrappedCurrency(currencyB, chainId),
      ]),
    [chainId, currencies],
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        return tokenA &&
          tokenB &&
          tokenA.chainId === tokenB.chainId &&
          !tokenA.equals(tokenB) &&
          V2_FACTORY_ADDRESSES[tokenA.chainId] &&
          INIT_CODE_HASHES[tokenA.chainId]
          ? computePairAddress({
            initCodeHash: INIT_CODE_HASHES[tokenA.chainId],
            factoryAddress: V2_FACTORY_ADDRESSES[tokenA.chainId],
            tokenA,
            tokenB,
          })
          : undefined;
      }),
    [tokens]
  )

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

  return useMemo(() => {
    return results.map((result, i) => {
      const { result: reserves, loading } = result
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (loading) return [PairState.LOADING, null]
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
      if (!reserves) return [PairState.NOT_EXISTS, null]
      const FAC = V2_FACTORY_ADDRESSES[tokenA.chainId];
      const IH = INIT_CODE_HASHES[tokenA.chainId];
      const { reserve0, reserve1 } = reserves
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return [
        PairState.EXISTS,
        new Pair(
          CurrencyAmount.fromRawAmount(token0 as any, reserve0.toString() as any),
          CurrencyAmount.fromRawAmount(token1 as any, reserve1.toString() as any),
          FAC,
          IH,
          FEES_NUMERATORS[tokenA.chainId],
          FEES_DENOMINATORS[tokenA.chainId]
        ),
      ]
    })
  }, [results, tokens])
}

export function usePair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  const pairCurrencies = useMemo<[Currency, Currency][]>(() => [[tokenA as any, tokenB as any]], [tokenA, tokenB])
  return usePairs(pairCurrencies)[0]
}
