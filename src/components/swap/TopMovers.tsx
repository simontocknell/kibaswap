import Badge, { BadgeVariant } from 'components/Badge'
import { TrendingDown as ChevronDown, TrendingUp as ChevronUp } from 'react-feather'
import { DarkGreyCard, GreyCard } from 'components/Card'
import React, { useCallback, useMemo } from 'react'
import { StyledInternalLink, TYPE } from 'theme'
import { fetchBscTokenData, getDeltaTimestamps, useBlocksFromTimestamps, useBnbPrices } from 'state/logs/bscUtils'
import { getTokenData, useEthPrice, useKibaPairData, useTopPairData } from 'state/logs/utils'

import { AutoColumn } from 'components/Column'
import { Currency } from '@uniswap/sdk-core'
import CurrencyLogo from 'components/CurrencyLogo'
import HoverInlineText from 'components/HoverInlineText'
import Marquee from "react-fast-marquee";
import { RowFixed } from 'components/Row'
import _ from 'lodash'
import axios from 'axios'
import cultureTokens from '../../../src/trending.json'
import { rgba } from 'polished'
import styled from 'styled-components/macro'
import { useIsDarkMode } from 'state/user/hooks'
import useTheme from 'hooks/useTheme'
import { useToken } from 'hooks/Tokens'
import { useWeb3React } from '@web3-react/core'

const CardWrapper = styled(StyledInternalLink)`
  min-width: 190px;
  width:100%;
  padding: 6px;
  :hover {
    cursor: pointer;
    opacity: 0.6;
    text-decoration: none;
  }
`

type TopMover = {
  id: number,
  name: string,
  symbol: string,
  slug: string,
  num_market_pairs: number,
  date_added: string,
  tags: string[],
  max_supply: number,
  circulating_supply: number,
  total_supply: number,
  platform: {
    id: number,
    name: string,
    symbol: string,
    slug: string,
    token_address: string,
  },
  is_active: number,
  cmc_rank: number,
  is_fiat: number,
  last_updated: string,
  quote: {
    USD:
    {
      price: number,
      volume_24h: number,
      volume_change_24h: number,
      percent_change_1h: number,
      percent_change_24h: number,
      percent_change_7d: number,
      percent_change_30d: number,
      percent_change_60d: number,
      percent_change_90d: number,
      market_cap: number,
      market_cap_dominance: number,
      fully_diluted_market_cap: string,
      last_updated: string
    }
  }
}

export const FixedContainer = styled(AutoColumn)``

export const ScrollableRow = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  ::-webkit-scrollbar {
    display: none;
  }
`

const DataCard = ({ tokenData, index }: { tokenData: any, index: number }) => {
  const { chainId } = useWeb3React()
  const darkMode = useIsDarkMode()
  const network = chainId == 1 ? 'ethereum' : chainId == 56 ? 'bsc' : 'ethereum'
  const route = tokenData?.pairAddress ?
    '/selective-charts/' + network + '/' + tokenData?.pairAddress :
    '/selective-charts/' + tokenData?.id + '/' + tokenData?.symbol + '/' + tokenData?.name + '/' + tokenData?.decimals

  return !tokenData?.id ? null : (
    <CardWrapper to={route} style={{
      width: 'auto',
      minWidth: 120
    }}>
      <GreyCard padding="3px 7px" style={{
        boxShadow: '0 0 1px rgb(0 0 0 / 10%), 0 2px 2px rgb(0 0 0 / 14%)',
        borderRadius: '20px'
      }}>
        <RowFixed>
          <AutoColumn style={{
            minHeight: '26px'
          }}>
            <TYPE.small color={darkMode ? 'white' : 'text1'} fontSize="12.5px" style={{
              display: 'flex',
              alignContent: 'center'
            }}>
              <div style={{
                display: 'flex',
                flexFlow: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Badge
                  style={{
                    marginRight: "8px",
                    height: '22px',
                    width: '22px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 'bold',
                    background: rgba(0, 0, 0, 0.5),
                    color: 'white'
                  }}
                  variant={BadgeVariant.POSITIVE_OUTLINE}>
                  {index + 1}
                </Badge>
                <CurrencyLogo style={{ marginRight: "2px" }} currency={(chainId === 1 || !chainId) ? { address: tokenData.id, symbol: tokenData.symbol, name: tokenData.name, chainId: chainId } as Currency : tokenData} size="20px" />
                <HoverInlineText text={chainId === 56 ? tokenData?.symbol : tokenData?.symbol?.substring(0, tokenData?.symbol?.length >= 7 ? 7 : tokenData.symbol.length)} />
                {!!tokenData?.priceChangeUSD && (
                  <>
                    {tokenData?.priceChangeUSD < 0 ?
                      <ChevronDown color={'red'} />
                      : <ChevronUp color={'green'} />
                    }&nbsp;
                    {parseFloat(tokenData?.priceChangeUSD).toFixed(2)}%
                  </>
                )}
              </div>
            </TYPE.small>
          </AutoColumn>
        </RowFixed>
      </GreyCard>
    </CardWrapper>
  )
}
DataCard.displayName = 'DataCard';


const _TopTokenMovers = () => {
  const allTokenData = useTopPairData()
  const { chainId } = useWeb3React()
  const [allTokens, setAllTokens] = React.useState<any>([])
  const kibaPair = useKibaPairData()
  const [hasEffectRan, setHasEffectRan] = React.useState(false);

  React.useEffect(() => {
    //clear out the tokens for refetch on network switch
    setHasEffectRan(false)
    setAllTokens([])
  }, [chainId])

  const fn = (async (isIntervalled: boolean) => {
    // validate the required parameters are all met before initializing a fetch
    const shouldEffectRun = !hasEffectRan || isIntervalled;
    if (shouldEffectRun) {
      if (allTokenData &&
        allTokenData.data &&
        kibaPair.data &&
        allTokenData.data.pairs &&
        kibaPair.data.pairs) {
        setHasEffectRan(true);
        const allTokensData = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${[
          ...kibaPair.data.pairs,
          ...allTokenData.data.pairs,
          ...cultureTokens.map((token) => ({
            token0: {
              id: token.address
            }
          })),
        ].map((pair: any) => {
          return pair.token0.id
        }).join(',')
          }`)

        let kibaAddress = '0x005D1123878Fc55fbd56b54C73963b234a64af3c'
        if (chainId && chainId === 56) {
          kibaAddress = '0xC3afDe95B6Eb9ba8553cDAea6645D45fB3a7FAF5'
        }

        const kibaData = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/` + kibaAddress)
        const allTokens = _.uniqBy(
          allTokensData.data.pairs.map((pair: any) => ({
            ...pair,
            id: pair.baseToken.address,
            priceChangeUSD: pair.priceChange['h24'],
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            pairAddress: pair.pairAddress
          })),
          (a: any) => a.baseToken.address
        )
        const pair = kibaData.data.pairs[0]
        const transformedKibaPair = {
          ...pair, id: pair.baseToken.address,
          priceChangeUSD: pair.priceChange['h24'],
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          pairAddress: pair.pairAddress
        }

        allTokens.push(transformedKibaPair)

        console.log(`[AllTokens]`, allTokens)

        setAllTokens(allTokens);
      }
    }
  })

  let cancelled = false;
  React.useEffect(() => {
    if (allTokenData.loading) return;
    if (kibaPair.loading) return;
    if (!hasEffectRan &&
      !cancelled &&
      allTokenData?.data?.pairs &&
      kibaPair?.data?.pairs
    ) {
      fn(false)
    }
    return () => { cancelled = true; }

  },
    [
      hasEffectRan,
      allTokenData,
      kibaPair,
      chainId
    ])

  const topPriceIncrease = useMemo(() => {
    const ourTokens = [
      ...allTokens.filter((a: any) => ["kiba"].includes(a?.symbol?.toLowerCase()) || a?.name?.toLowerCase() === 'kiba inu'),
      ...allTokens.filter((a: any) => ['wci'].includes(a?.symbol?.toLowerCase())), // slot WCI at position #2 because of the partnership
      ...allTokens.filter((a: any) => cultureTokens.map(a => a?.address?.toLowerCase()).includes(a?.baseToken?.address?.toLowerCase()) || cultureTokens.map(b => b?.name?.toLowerCase()).includes(a?.name?.toLowerCase())),
    ];
    return _.uniqBy([
      // slot kiba and any paying / partnerships at #1 always
      ...ourTokens,
      ...allTokens
    ], i => i.baseToken.address)
  }, [allTokens, chainId])

  const mappedTokens = useMemo(() => topPriceIncrease.filter((a: any) => !a?.symbol?.includes('SCAM') && !a?.symbol?.includes('rebass')), [topPriceIncrease]);
  return useMemo(() => (
    <DarkGreyCard style={{
      zIndex: 3,
      padding: 0,
      borderRadius: 0,
      boxShadow: 'inset 0 0 4px rgba(0, 0, 0, 0.4)',
      top: 0,
      margin: 0
    }}>
      {(allTokens.length > 0) &&
        (
          <Marquee gradient={false} pauseOnHover>
            <React.Fragment />
            <FixedContainer>
              <ScrollableRow>
                {mappedTokens.map((entry, i) =>
                  entry ? <DataCard index={i} key={`${i}.${entry.symbol}.${entry.address}`} tokenData={entry} /> : null
                )}
              </ScrollableRow>
            </FixedContainer>
          </Marquee>
        )
      }
    </DarkGreyCard>
  ), [mappedTokens, allTokens, chainId])
}
_TopTokenMovers.displayName = 'topMovers'
export const TopTokenMovers = _TopTokenMovers
