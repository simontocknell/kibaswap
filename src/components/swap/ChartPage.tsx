import * as ethers from 'ethers'

import Badge, { BadgeVariant } from 'components/Badge';
import { BarChart, ChevronDown, ChevronRight, ChevronUp, Filter, Percent, X } from 'react-feather';
import React, { useCallback, useEffect, useRef } from 'react';
import TradingViewWidget, { Themes } from 'react-tradingview-widget';
import { fetchBscHolders, fetchBscTokenData, useBnbPrices, useBscPoocoinTransactions, useBscTokenData, useBscTokenTransactions } from 'state/logs/bscUtils';
import { getTokenData, toChecksum, useEthPrice, usePairs, useTokenData, useTokenDataHook, useTokenTransactions } from 'state/logs/utils';
import { useBscToken, useToken } from 'hooks/Tokens';
import { useConvertTokenAmountToUsdString, useKiba } from 'pages/Vote/VotePage';

import BarChartLoaderSVG from './BarChartLoader';
import { ChartSidebar } from 'components/ChartSidebar';
import { Dots } from './styleds';
import { Pair } from 'pages/Charts/PairSearch';
import ReactGA from 'react-ga'
import { StyledInternalLink } from 'theme';
import Tooltip from 'components/Tooltip';
import _ from 'lodash';
import axios from 'axios'
import { getBep20Contract } from 'utils/binance.utils';
import moment from 'moment';
import { number } from '@lingui/core/cjs/formats';
import styled from 'styled-components/macro';
import { system } from 'styled-system';
import { useHasAccess } from 'pages/Account/AccountPage';
import useInterval from 'hooks/useInterval';
import { useUSDCValue } from 'hooks/useUSDCPrice';
import { useUserLocale } from 'state/user/hooks';
import { useWeb3React } from '@web3-react/core';

const StyledDiv = styled.div`
font-family: 'Bangers', cursive;
font-size:25px;
`

const StyledA = styled.a`
    font-family:'Inter var', sans-serif !important;
    color: ${({ theme }) => theme.primary1};
`
export const useTokenHolderCount = (address: string, chainId?: number) => {
    const [data, setData] = React.useState<any | undefined>()
    function intervalCallback() {
        if (!address) return;
        if (chainId && chainId === 1 || !chainId)
            fetch(`https://api.ethplorer.io/getTokenInfo/${address}?apiKey=EK-htz4u-dfTvjqu-7YmJq`, { method: 'get' })
                .then(res => res.json())
                .then(setData);
        else if (chainId && chainId === 56)
            fetchBscHolders(address).then((response) => setData({ holdersCount: response }));
    }
    React.useEffect(() => {
        intervalCallback()
    }, [address, chainId])

    useInterval(intervalCallback, 30000)
    return data;
}

type EtherscanTokenInfo = {
    contractAddress: string
    tokenName: string
    symbol: string
    divisor: string
    tokenType: string
    totalSupply: string
    blueCheckmark: string
    description?: string
    website?: string
    email?: string
    blog?: string
    reddit?: string
    facebook?: string
    twitter?: string
    github?: string
    telegram?: string
    wechat?: string
    linkedin?: string
    discord?: string
    tokenPriceUSD?: string
}

export type TokenInfo =
    {
        address: string,
        totalSupply: number,
        name: string,
        symbol: string,
        decimals: number,
        price: {
            rate: number,
            currency: number,
            diff: string | number,
            diff7d: string | number,
            diff30d: string | number,
            marketCapUsd: string | number,
            availableSupply: string | number,
            volume24h: string | number,
            ts: string | number,
        } | false,
        publicTags: string[]
        owner: string,
        countOps: number,
        totalIn: number,
        totalOut: number,
        transfersCount: number,
        ethTransfersCount: number,
        holdersCount: number,
        issuancesCount: number,
        image: string,
        description: string,
        coingecko?: string,
        website?: string,
        twitter?: string;
        lastUpdated: string | number
    }

export const getEtherscanTokenInfo = async (tokenAddress: string) => {
    const result = await axios.get(`https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress=${tokenAddress}&apikey=2SIRTH18CHU6HM22AGRF1XE9M7AKDR9PM7 `)
    console.log(`etherscan token info response:`, result.data)
    return result.data
}



export const fetchTokenInfo = async (chainId: number | undefined, tokenAddress: string | undefined) => {
    if (!chainId || !tokenAddress) return

    if (chainId === 1 || !chainId) {
        return new Promise((resolve, reject) => {
            fetch(`https://api.ethplorer.io/getTokenInfo/${tokenAddress}?apiKey=EK-htz4u-dfTvjqu-7YmJq`)
                .then((response) => response.json())
                .then(tokenInfo => resolve(tokenInfo))
                .catch((err) => reject(err))
        })
    }
}
const useIntervalAsync = (fn: () => Promise<unknown>, ms: number) => {
    const timeout = useRef<number>();
    const mountedRef = useRef(false);
    const run = useCallback(async () => {
        await fn();
        if (mountedRef.current) {
            timeout.current = window.setTimeout(run, ms);
        }
    }, [fn, ms]);
    useEffect(() => {
        mountedRef.current = true;
        run();
        return () => {
            mountedRef.current = false;
            window.clearTimeout(timeout.current);
        };
    }, [run]);
};

export const fetchDexscreenerToken = (address: string) => {
    const getData = (async () => {
        if (address) {
            const response = await axios.get<{ pairs?: Pair[], pair?: Pair }>(`https://api.dexscreener.com/latest/dex/tokens/${address}`)

            const dataSet = response?.data?.pair ? response?.data?.pair : response?.data?.pairs?.[0]
            return dataSet
        } else {
            return {}
        }
    })
    return getData()
}

export const useDexscreenerToken = (address?: string) => {
    const [data, setData] = React.useState<Pair>()

    const getData = useCallback(async () => {
        if (address) {
            const response = await axios.get<{ pairs?: Pair[], pair?: Pair }>(`https://api.dexscreener.com/latest/dex/tokens/${address}`)

            const dataSet = response?.data?.pair ? response?.data?.pair : response?.data?.pairs?.[0]
            setData(dataSet)
        }
    }, [address])

    useIntervalAsync(getData, 15000)

    if (!address) return
    return data
}

export const useDexscreenerPair = (pairAddress: string, chainId?: number) => {
    const [data, setData] = React.useState<Pair>()

    React.useEffect(() => {
        if (pairAddress) {
            const chainIdValue = chainId ?? 1
            const network = chainIdValue == 1 ? 'ethereum' : chainIdValue == 56 ? 'bsc' : 'ethereum';
            axios.get(`https://api.dexscreener.com/latest/dex/pairs/${network}/${pairAddress}`)
                .then((response) => {
                    setData(response.data?.pairs?.[0])
                })
        }
    }, [pairAddress, chainId])

    if (!pairAddress) return
    return data
}

export const useTokenInfo = (chainId: number | undefined, tokenAddress: string | undefined) => {
    const [tokenInfo, setTokenInfo] = React.useState<TokenInfo>()
    const [etherscanTokeninfo, setEtherscanTokeninfo] = React.useState<any>({})
    const [loading, updateLoading] = React.useState(false)
    const handleE = (e: any) => console.error(`[useTokenInfo]`, e)
    const intervalCallback = React.useCallback(function () {
        if (loading) return;
        updateLoading(true)
        axios.get(`https://api.ethplorer.io/getTokenInfo/${tokenAddress}?apiKey=EK-htz4u-dfTvjqu-7YmJq`)
            .then(response => {
                setTokenInfo(response.data)
            }).finally(() => {
                updateLoading(false)
            }).catch(handleE)
    }, [tokenAddress, loading])

    React.useEffect(() => {
        const asyncFunc = async () => {
            const contract = getBep20Contract(toChecksum(tokenAddress) as string)
            const [name, symbol, decimals] = await Promise.all(
                [
                    contract.name().catch((e: unknown) => console.error(`[useTokenInfo]`, e)),
                    contract.symbol().catch((e: unknown) => console.error(`[useTokenInfo]`, e)),
                    contract.decimals().catch((e: unknown) => console.error(`[useTokenInfo]`, e))
                ]
            )

            const model = {
                chainId: 56,
                name,
                symbol,
                decimals: ethers.BigNumber.from(decimals).toNumber(),
                address: tokenAddress
            }
            setTokenInfo(model as any)
        }

        if (Boolean(!chainId || (chainId && chainId == 1)) && tokenAddress) {
            intervalCallback()
        } else {
            if (chainId == 56 && tokenAddress) {
                asyncFunc()
            }
        }
    }, [chainId, tokenAddress])


    if (!tokenAddress) return
    return { ...tokenInfo, ...etherscanTokeninfo }
}

export const useHolderCount = (chainId: any) => {
    const [holdersCount, setHoldersCount] = React.useState<any | undefined>()
    function handleError(error: unknown) { console.error(`[useHolderCount]: Error`, error); }
    function intervalCallback() {
        if (chainId === 1 || !chainId)
            fetch('https://api.ethplorer.io/getTokenInfo/0x005d1123878fc55fbd56b54c73963b234a64af3c?apiKey=EK-htz4u-dfTvjqu-7YmJq', { method: 'get' })
                .then(res => res.json())
                .then(setHoldersCount)
                .catch(handleError);
        if (chainId === 56) fetchBscHolders('0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5').then((response: any) => {
            setHoldersCount({ holdersCount: response })
        })
    }
    React.useEffect(() => {
        intervalCallback()
    }, [chainId])

    useInterval(intervalCallback, 30000)
    return holdersCount;
}

const TransactionList = ({ lastFetched, transactions, tokenData, chainId }: { lastFetched: any, transactions: any, tokenData: any, chainId?: number }) => {
    const [filterAddress, setFilterAddress] = React.useState<string | undefined>()

    const windowInnerWidth = window.innerWidth

    const isMobile = React.useMemo(() => windowInnerWidth <= 768, [windowInnerWidth])
    const chainLabel = (!chainId || chainId && chainId === 1) ? `ETH` : chainId && chainId === 56 ? 'BNB' : 'ETH';
    const lastUpdated = React.useMemo(() => moment(lastFetched).fromNow(), [moment(lastFetched).fromNow()])


    const formattedTransactions = React.useMemo(() => transactions?.swaps?.map((swap: any) => {
        const netToken0 = swap.amount0In - swap.amount0Out
        const netToken1 = swap.amount1In - swap.amount1Out
        const newTxn: Record<string, any> = {}
        if (netToken0 < 0) {
            newTxn.token0Symbol = (swap.pair).token0.symbol
            newTxn.token1Symbol = (swap.pair).token1.symbol
            newTxn.token0Amount = Math.abs(netToken0)
            newTxn.token1Amount = Math.abs(netToken1)
        } else if (netToken1 < 0) {
            newTxn.token0Symbol = (swap.pair).token1.symbol
            newTxn.token1Symbol = (swap.pair).token0.symbol
            newTxn.token0Amount = Math.abs(netToken1)
            newTxn.token1Amount = Math.abs(netToken0)
        }
        newTxn.transaction = swap.transaction;
        newTxn.hash = swap.transaction.id
        newTxn.timestamp = swap?.timestamp ? swap?.timestamp : swap.transaction.timestamp
        newTxn.type = 'swap'
        newTxn.amountUSD = swap.amountUSD;
        newTxn.account = ["0x10ed43c718714eb63d5aa57b78b54704e256024e".toLowerCase(), "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D".toLowerCase()].includes(swap.to.toLowerCase()) ? swap.from : swap.to
        newTxn.count = transactions?.swaps?.filter((x: any) => (["0x10ed43c718714eb63d5aa57b78b54704e256024e", "0x7a250d5630b4cf539739df2c5dacb4c659f2488d".toLowerCase()].includes(x.to.toLowerCase()) ? x.from : x.to) === newTxn.account).length;
        return newTxn;
    }).filter((newTxn: any) => !filterAddress ? true : newTxn.account === filterAddress), [transactions, filterAddress])

    const tooltipContent = React.useMemo(() => {
        return (item: any) => {
            const isSell = ({ token0Symbol }: any) => token0Symbol === `W${chainLabel}`
            const sellCount = formattedTransactions?.filter((t: any) => t.account === item.account && isSell(t))?.length;
            const amountSold = _.sumBy(formattedTransactions?.filter((t: any) => t.account === item.account && isSell(t)), (i: any) => parseFloat(i.amountUSD))
            const amountBought = _.sumBy(formattedTransactions?.filter((t: any) => t.account === item.account && !isSell(t)), (i: any) => parseFloat(i.amountUSD))
            const buyCount = formattedTransactions?.filter((t: any) => t.account === item.account && !isSell(t))?.length;
            return (
                <div style={{ width: 'auto', display: 'flex', flexFlow: 'column wrap', alignItems: 'center', justifyContent: 'start', gap: '1.5px 3px' }}>
                    <small style={{ color: "#fff", marginBottom: 2 }}>Total tx:  <Badge variant={BadgeVariant.DEFAULT}>{buyCount + sellCount}</Badge></small>
                    <small style={{ color: '#fff', marginBottom: 2 }}>Buys: <Badge variant={BadgeVariant.POSITIVE_OUTLINE}>{buyCount} / ${Number(amountBought).toLocaleString()}</Badge></small>
                    <small style={{ color: '#fff' }}>Sells: <Badge variant={BadgeVariant.NEGATIVE_OUTLINE}>{sellCount} / ${Number(amountSold).toLocaleString()}</Badge></small>
                </div>
            ) as any
        }
    }, [formattedTransactions])
    const holdersCount = useHolderCount(chainId)
    const price = React.useMemo(() => tokenData?.priceUSD ?
        parseFloat(tokenData?.priceUSD) : (tokenData?.derivedUSD ? parseFloat(tokenData?.derivedUSD) : holdersCount && holdersCount?.price?.rate ?
            parseFloat(holdersCount?.price?.rate) : NaN)
        , [tokenData, holdersCount])
    const CIRCULATING_SUPPLY = 1000000000000;
    const marketCap = React.useMemo(() => !price ? undefined : Number(((price) * CIRCULATING_SUPPLY).toFixed(0)).toLocaleString(), [price])
    const fromNow = React.useMemo(() => {
        return (transaction: any) =>
            moment(+transaction.timestamp * 1000).fromNow()
    }, [formattedTransactions])
    const [tooltipShown, setTooltipShown] = React.useState<any>()
    const [showRemoveFilter, setShowRemoveFilter] = React.useState<any>()
    const totalTransactions = React.useMemo(() => (tokenData && tokenData?.txCount) ?
        tokenData?.txCount :
        (tokenData && tokenData?.totalTransactions) ? tokenData?.totalTransactions
            : undefined, [tokenData])
    const clearRemoveFilter = () => setFilterAddress(undefined);
    const filterAccountClick = (item: any) => {
        setFilterAddress(item.account)
    }
    const hideRemoveFilter = () => setShowRemoveFilter(undefined);
    const clearTooltipShown = () => setTooltipShown(undefined);
    React.useEffect(() => {
        // log selected wallet
        ReactGA.event({
            category: 'Chart',
            action: 'View Chart Page',
        })
    }, [])
    return (
        <>
            <StyledDiv
                style={{
                    alignItems: 'center',
                    width: '100%',
                    display: 'flex',
                    flexFlow: 'row wrap',
                    justifyContent: 'stretch',
                    gap: '1.5px 9px',
                    flex: '1 1',
                    flexGrow: 1
                }}>
                {
                    <>

                        {!isNaN(price) && parseFloat(price.toString()) >= 0 && <>
                            <small>
                                <small style={{ display: 'block' }}>Price</small>
                                <Badge variant={tokenData?.priceChangeUSD <= 0 ? BadgeVariant.NEGATIVE_OUTLINE : BadgeVariant.POSITIVE_OUTLINE}>{(+price?.toFixed(14))}</Badge>
                            </small>
                            {!!tokenData?.priceChangeUSD && <small >
                                <small style={{ display: 'block', textAlign: 'left' }}>24hr %</small>
                                <Badge variant={tokenData?.priceChangeUSD <= 0 ? BadgeVariant.NEGATIVE_OUTLINE : BadgeVariant.POSITIVE_OUTLINE} style={{ width: 'fit-content', display: 'flex', justifyContent: 'flex-end' }}>
                                    {tokenData?.priceChangeUSD && tokenData?.priceChangeUSD <= 0 ? <ChevronDown /> : <ChevronUp />}
                                    {tokenData?.priceChangeUSD?.toFixed(2)}  <Percent />
                                </Badge>
                            </small>}
                        </>}
                        {holdersCount && holdersCount?.holdersCount && (
                            <small>
                                <small style={{ display: 'block' }}>Holders</small>
                                <Badge variant={BadgeVariant.WARNING_OUTLINE}>{holdersCount.holdersCount}</Badge>
                            </small>
                        )}
                        {marketCap && (
                            <small>
                                <small style={{ display: 'block' }}>Market Cap</small>
                                <Badge variant={BadgeVariant.WARNING_OUTLINE}>${marketCap}</Badge>
                            </small>
                        )}

                        {!!tokenData?.oneDayVolumeUSD && (
                            <small>
                                <small style={{ display: 'block' }}>Daily Volume</small>
                                <Badge variant={BadgeVariant.WARNING_OUTLINE}>${Number(parseFloat(tokenData?.oneDayVolumeUSD)?.toFixed(0)).toLocaleString()}</Badge>
                            </small>
                        )}
                        {totalTransactions && (
                            <small>
                                <small style={{ display: 'block' }}>Total Txs</small>
                                <Badge variant={BadgeVariant.WARNING_OUTLINE}>{Number(parseFloat(totalTransactions)?.toFixed(0)).toLocaleString()}</Badge>
                            </small>
                        )}
                        {tokenData?.totalLiquidityUSD && <small>
                            <small style={{ display: 'block' }}>Total Liquidity</small>
                            <Badge variant={BadgeVariant.WARNING_OUTLINE}>
                                ${Number((tokenData?.totalLiquidityUSD * 2).toFixed(0)).toLocaleString()}
                            </Badge></small>}
                    </>
                }
            </StyledDiv>
            {lastUpdated && (
                <span style={{ display: 'flex', marginTop: 3, justifyContent: 'space-between', textAlign: 'right' }}>
                    {filterAddress !== undefined && <small>Filtering transactions by <Badge><small>{filterAddress.slice(0, 6) + '...' + filterAddress.slice(38, 42)}</small></Badge> &nbsp;</small>}
                    <small>{`Last updated ${lastUpdated}`} {chainId && chainId === 56 && <><br /><small></small></>}</small>
                </span>
            )}
            <div style={{
                display: 'block',
                width: '100%',
                overflowY: 'auto',
                maxHeight: 500
            }}>
                <table style={{ width: '100%' }}>
                    <thead style={{
                        textAlign: 'left',
                        position: 'sticky',
                        top: 0,
                        background: 'linear-gradient(#181C27, #131722)',
                        fontWeight: 200
                    }}>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amt {chainLabel}</th>
                            <th>Amt USD</th>
                            <th>Amt Tokens</th>
                            <th>Tx</th>
                            <th>Maker</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {!formattedTransactions?.length && <tr><td colSpan={5}>Loading transaction data <Dots></Dots></td></tr>}
                        {formattedTransactions && formattedTransactions?.map((item: any, index: number) => (
                            <tr key={`_${item.timestamp * 1000}_${item.hash}_${index}`}>
                                <td style={{ fontSize: 12 }}>{fromNow(item)}</td>
                                <td style={{ color: item.token0Symbol === `W${chainLabel}` ? 'red' : 'green' }}>{item.token0Symbol === `W${chainLabel}` ? 'SELL' : 'BUY'}</td>
                                <td>{item.token0Symbol === `W${chainLabel}` && <>{Number(+item.token0Amount?.toFixed(2))?.toLocaleString()} {item.token0Symbol}</>}
                                    {item.token1Symbol === `W${chainLabel}` && <>{Number(+item.token1Amount?.toFixed(2))?.toLocaleString()} {item.token1Symbol}</>}
                                </td>
                                <td>${Number(parseFloat(item.amountUSD).toFixed(2)).toLocaleString()}</td>
                                <td>{item.token0Symbol !== `W${chainLabel}` && <>{Number(+item.token0Amount?.toFixed(2))?.toLocaleString()} {item.token0Symbol}</>}
                                    {item.token1Symbol !== `W${chainLabel}` && <>{Number(+item.token1Amount?.toFixed(2))?.toLocaleString()} {item.token1Symbol}</>}
                                </td>
                                <td>
                                    <StyledA href={`https://${(!chainId || chainId === 1) ? 'etherscan.io' : 'bscscan.com'}/tx/${item?.hash}`}>
                                        {item?.hash && item?.transaction?.id.slice(0, 6) + '...' + item?.transaction?.id.slice(38, 42)}
                                    </StyledA>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <StyledA href={`https://${(!chainId || chainId === 1) ? 'etherscan.io' : 'bscscan.com'}/address/${item.account}`}>
                                            {item.account && item.account.slice(0, 6) + '...' + item.account.slice(38, 42)}
                                        </StyledA>
                                        {item.account && <StyledInternalLink to={`/details/${item.account}`}><ChevronRight /></StyledInternalLink>}
                                    </div>
                                </td>
                                <td >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ cursor: 'pointer' }} title={`Filter transactions by ${item.account}`}>
                                            {!isMobile && !filterAddress && <Filter fill={filterAddress ? 'purple' : 'gray'} onClick={() => filterAccountClick(item)} />}
                                            {!isMobile && (
                                                <React.Fragment>
                                                    {!!filterAddress && (

                                                        <X fill={'red'}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={clearRemoveFilter}
                                                            onMouseEnter={() => setShowRemoveFilter(item)}
                                                            onMouseLeave={hideRemoveFilter} />
                                                    )}
                                                </React.Fragment>
                                            )}
                                        </span>
                                        {!isMobile && item.count > 2 && (<Tooltip placement={'auto-end'}
                                            text={tooltipContent(item)}
                                            show={tooltipShown &&
                                                tooltipShown?.amountUSD === item?.amountUSD &&
                                                tooltipShown?.transaction?.id === item?.transaction?.id}>
                                            <Badge style={{ cursor: 'pointer' }}
                                                onMouseEnter={() => setTooltipShown(item)}
                                                onMouseLeave={clearTooltipShown}
                                                variant={BadgeVariant.PRIMARY}>
                                                {item.count}
                                            </Badge>
                                        </Tooltip>)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}


const FrameWrapper = styled.div`
width:100%;
display:flex;
flex-flow:column wrap;
max-width:100%;
overflow-y:auto;
`

export const Chart = () => {
    const windowInnerWidth = window.innerWidth

    const isMobile = React.useMemo(() => windowInnerWidth <= 768, [windowInnerWidth])
    const { chainId, account } = useWeb3React();
    const kibaBalance = useKiba(account)
    const [ethPrice, ethPriceOld] = useEthPrice()
    const pairs = usePairs('0x005d1123878fc55fbd56b54c73963b234a64af3c')
    const transactionData = useTokenTransactions('0x005d1123878fc55fbd56b54c73963b234a64af3c'.toLowerCase(), pairs, 60000)
    const isBinance = React.useMemo(() => chainId && chainId === 56, [chainId])
    const binanceTransactionData = useBscTokenTransactions('0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5'.toLowerCase(), chainId == 56 ? 'bsc' : 'ethereum', 60000)
    const prices = useBnbPrices()
    const hasAccess = useHasAccess()
    const accessDenied = !hasAccess
    const [view, setView] = React.useState<'chart' | 'market'>('chart')
    const frameURL = React.useMemo(() => {
        return chainId === 56 ?
            `PANCAKESWAP:KIBAWBNB` :
            `UNISWAP:KIBAWETH`
    }, [chainId])
    const tokenDataAddress = React.useMemo(() => (!chainId || chainId === 1) ?
        '0x005d1123878fc55fbd56b54c73963b234a64af3c'.toLowerCase()
        : chainId === 56 ?
            '0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5'.toLowerCase() : '', [chainId])
    const [tokenDataPriceParam, tokenDataPriceParamTwo] = React.useMemo(() => {
        const valueOne = chainId === 56 ? prices?.current : ethPrice;
        const valueTwo = chainId === 56 ? prices?.oneDay : ethPriceOld;
        return [valueOne, valueTwo]
    }, [chainId, prices, ethPrice, ethPriceOld])
    const tokenData = useTokenDataHook(tokenDataAddress, tokenDataPriceParam, tokenDataPriceParamTwo)
    const locale = useUserLocale()
    const [collapsed, setCollapsed] = React.useState(false)
    const token = useToken(tokenDataAddress)
    const params = useConvertTokenAmountToUsdString(token as any | undefined, kibaBalance as any, pairs?.[0], transactionData?.data)
    const gridTemplateStyle = React.useMemo(() => isMobile ? '100%' : (collapsed ? '5% 95%' : '25% 75%'), [isMobile, collapsed])
    const holdings = {
        token: tokenData,
        tokenBalance: kibaBalance,
        tokenValue: undefined,
        formattedUsdString: params?.value,
        refetchUsdValue: params?.refetch
    }
    const gridColumnGap = 10
    const setChartView = () => setView('chart')
    const setMarketView = () => setView('market')
    return (
        <FrameWrapper style={{
            background: '#252632',
            borderRadius: 30,
            padding: 10,

        }} >
            <div style={{
                display: 'grid',
                gridTemplateColumns: gridTemplateStyle,
                columnGap: gridColumnGap
            }}>
                <ChartSidebar
                    holdings={holdings}
                    loading={!tokenData}
                    token={{
                        address: tokenDataAddress,
                        decimals: '18',
                        name: 'Kiba Inu',
                        symbol: 'KIBA'
                    }}
                    tokenData={tokenData}
                    chainId={chainId}
                    collapsed={collapsed}
                    onCollapse={(collapsed) => setCollapsed(collapsed)} />
                <div style={{
                    display: 'block',
                    marginBottom: 5,
                    width: '100%',
                    padding: "9px 6px"
                }}>
                    <div style={{ display: 'flex', marginBottom: 5, alignItems: 'center', flexFlow: "row wrap" }}>
                        <a style={{ marginRight: 15 }} href="https://www.dextools.io/app/ether/pair-explorer/0xbf6dcdfe6e138428f5abe709e33e8ac1f7780e48">
                            <img src={'https://miro.medium.com/max/663/1*eV5_P4s2WQkgzVM_XdgWSw.png'}
                                style={{ maxWidth: 100 }} />
                        </a>
                        <a href={'https://app.moontools.io/pairs/uniswap/0xbf6dcdfe6e138428f5abe709e33e8ac1f7780e48'} style={{ marginRight: 15 }}>
                            <img src={'https://miro.medium.com/max/440/1*rtdc0fgltZdBep3miLuSuQ.png'}
                                style={{ maxWidth: 100 }} />
                        </a>
                        <a href={'https://coingecko.com/en/coins/kiba-inu'} style={{ marginRight: 15 }}>
                            <img src={'https://cdn.filestackcontent.com/MKnOxRS8QjaB2bNYyfou'}
                                style={{ maxWidth: 30 }} />
                        </a>
                        <a href={'https://coinmarketcap.com/en/currencies/kiba-inu'} style={{ marginRight: 15 }}>
                            <img src={'https://doostoken.com/assets/images/site/brand/new/png/coinmarketcap.png'}
                                style={{ maxWidth: 30 }} />
                        </a>
                        {!isBinance && <Badge style={{ color: "#fff", textDecoration: 'none' }}>ETH: ${ethPrice && (+ethPrice)?.toFixed(2)}</Badge>}
                        {!!isBinance && <Badge style={{ color: "#fff", textDecoration: 'none' }}>BNB: ${prices && (+prices?.current)?.toFixed(2)}</Badge>}
                    </div>

                    {/* Message if the connected wallet is not authorized to view charting.*/}
                    {accessDenied && <div style={{
                        width: '100%',
                        padding: '9px 14px',
                        height: 400,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>

                        <StyledDiv style={{ color: "#fff", display: 'flex', width: '100%', justifyContent: 'center' }}>
                            You must own Kiba Inu tokens to use this feature!
                        </StyledDiv>
                    </div>}

                    {accessDenied === false &&
                        <React.Fragment>
                            {/* Chart Navigation Row */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 15,
                                flexFlow: 'row wrap'
                            }}>
                                <div style={{
                                    alignItems: 'center',
                                    flexFlow: 'row wrap',
                                    display: 'flex'
                                }}>
                                    {/* Nav Items */}
                                    <StyledDiv onClick={setChartView} style={{
                                        cursor: 'pointer',
                                        marginRight: 10,
                                        textDecoration: view === 'chart' ? 'underline' : ''
                                    }}>
                                        KibaCharts
                                    </StyledDiv>

                                    <StyledDiv style={{
                                        cursor: 'pointer',
                                        marginRight: 10,
                                        textDecoration: view === 'market' ? 'underline' : ''
                                    }} onClick={setMarketView}>
                                        MarketView
                                    </StyledDiv>
                                </div>

                                {isBinance && <StyledDiv>Binance</StyledDiv>}
                                {!isBinance && (
                                    <StyledDiv style={{ alignItems: 'center', display: 'flex', color: "#FFF" }}>
                                        <StyledInternalLink style={{
                                            fontSize: 25,
                                            color: "#FFF"
                                        }} to="/selective-charts">
                                            View Charts for Other Tokens
                                        </StyledInternalLink>
                                        <ChevronRight />
                                        <Badge>Beta</Badge>
                                    </StyledDiv>
                                )}
                            </div>
                        </React.Fragment>}

                    {/* Market View */}
                    {accessDenied === false &&
                        view === 'market' && (
                            <div style={{ display: 'flex', flexFlow: 'column wrap', alignItems: 'center' }}>
                                <iframe src="https://www.tradingview.com/mediumwidgetembed/?symbols=BTC,COINBASE%3AETHUSD%7C12M,BINANCEUS%3ABNBUSD%7C12M&BTC=COINBASE%3ABTCUSD%7C12M&fontFamily=Trebuchet%20MS%2C%20sans-serif&bottomColor=rgba(41%2C%2098%2C%20255%2C%200)&topColor=rgba(41%2C%2098%2C%20255%2C%200.3)&lineColor=%232962FF&chartType=area&scaleMode=Normal&scalePosition=no&locale=en&fontColor=%23787B86&gridLineColor=rgba(240%2C%20243%2C%20250%2C%200)&width=1000px&height=calc(400px%20-%2032px)&colorTheme=dark&utm_source=www.tradingview.com&utm_medium=widget_new&utm_campaign=symbol-overview&showFloatingTooltip=1" style={{ border: '1px solid linear-gradient(#181C27, #131722)', borderRadius: 6, width: '100%', height: 500 }} />
                            </div>
                        )}

                    {view === 'chart' && accessDenied === false && <>
                        {/* Chart Component */}
                        <div style={{ width: '100%', marginTop: '0.5rem', marginBottom: '0.25rem', height: isBinance ? 700 : 500 }}>
                            {!isBinance && <TradingViewWidget hide_side_toolbar={false} locale={locale} theme={'Dark'} symbol={frameURL} autosize />}
                            {/* Add back in the idefined Iframe chart until trading view gets there shit back together*/}
                            {!!isBinance && <iframe src={'https://www.defined.fi/bsc/0x6499b4f8263fc3be2d4577fffcee87c972a07be9'} style={{ height: 700, borderRadius: 10, width: '100%', border: '1px solid red', background: 'transparent' }} />}
                        </div>
                    </>}

                    {accessDenied === false && view === 'chart' && (
                        <div style={{ display: 'block' }}>
                            {/* Loading Transaction data for either chain */}
                            {(!isBinance && transactionData?.loading) ||
                                (isBinance && binanceTransactionData.loading) && (
                                    <div style={{ background: 'linear-gradient(#181C27, #131722)', padding: '9px 14px', display: 'flex', alignItems: 'center' }}><BarChartLoaderSVG /></div>
                                )}

                            {/* ETH Transaction List */}
                            {!isBinance &&
                                transactionData?.data?.swaps?.length &&
                                tokenData &&
                                tokenData?.priceUSD &&
                                <div style={{
                                    width: '100%',
                                    overflowY: 'auto',
                                    padding: '9px 14px',
                                    background: 'rgb(22, 22, 22)',
                                    color: '#fff',
                                    borderRadius: 6,
                                    flexFlow: 'column wrap',
                                }}>
                                    <TransactionList chainId={chainId}
                                        lastFetched={transactionData.lastFetched}
                                        transactions={transactionData.data}
                                        tokenData={tokenData} />
                                </div>
                            }
                            {/* Binance Smart Chain Transaction List */}
                            {isBinance && binanceTransactionData?.data?.swaps?.length > 0 && (
                                <div style={{
                                    width: '100%',
                                    overflowY: 'auto',
                                    padding: '9px 14px',
                                    background: 'rgb(22, 22, 22)',
                                    color: '#fff',
                                    borderRadius: 6,
                                    flexFlow: 'column wrap',
                                    gridColumnGap: 50
                                }}>
                                    <TransactionList chainId={chainId}
                                        lastFetched={binanceTransactionData.lastFetched}
                                        transactions={binanceTransactionData.data}
                                        tokenData={tokenData} />
                                </div>
                            )}
                        </div>
                    )}
                    {accessDenied === false && view === 'market' && <div style={{ display: 'grid', gridTemplateColumns: '100%' }}>

                        <iframe src='https://www.tradingview-widget.com/embed-widget/crypto-mkt-screener/?locale=en#%7B%22width%22%3A1000%2C%22height%22%3A490%2C%22defaultColumn%22%3A%22overview%22%2C%22screener_type%22%3A%22crypto_mkt%22%2C%22displayCurrency%22%3A%22USD%22%2C%22colorTheme%22%3A%22dark%22%2C%22market%22%3A%22crypto%22%2C%22enableScrolling%22%3Atrue%2C%22utm_source%22%3A%22www.tradingview.com%22%2C%22utm_medium%22%3A%22widget_new%22%2C%22utm_campaign%22%3A%22cryptomktscreener%22%7D' style={{ border: '1px solid linear-gradient(#181C27, #131722)', marginTop: 10, borderRadius: 30, height: 500, width: '100%' }} />
                    </div>}
                </div>
            </div>

        </FrameWrapper>
    )
}

export const ChartPage = Chart;