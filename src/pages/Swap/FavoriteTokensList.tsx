import { ButtonConfirmed, ButtonError } from 'components/Button'
import { CNav, CNavItem, CNavLink, CTabContent, CTabPane, CTable, CTableBody, CTableCaption, CTableDataCell, CTableFoot, CTableHead, CTableHeaderCell, CTableRow, CTooltip } from '@coreui/react'
import { ChevronDown, ChevronUp, Info, MinusCircle } from 'react-feather'
import React, { useEffect, useMemo } from 'react'
import { StyledInternalLink, TYPE } from 'theme'
import { useAddPairToFavorites, useUserFavoritesManager } from 'state/user/hooks'
import { useConvertTokenAmountToUsdString, useKiba } from 'pages/Vote/VotePage';
import { useCurrencyBalance, useCurrencyBalances } from 'state/wallet/hooks'

import { AddTokenToFavoritesModal } from './AddTokenToFavoritesModal'
import { AutoColumn } from 'components/Column'
import { DarkCard } from 'components/Card'
import Loader from 'components/Loader';
import { SwapTokenForTokenModal } from 'components/ChartSidebar/SwapTokenForTokenModal'
import Tooltip from 'components/Tooltip'
import _ from 'lodash'
import { abbreviateNumber } from 'components/BurntKiba'
import moment from 'moment'
import styled from 'styled-components/macro'
import { toChecksum } from 'state/logs/utils'
import { useActiveWeb3React } from 'hooks/web3'
import { useCurrency } from 'hooks/Tokens'
import { useDexscreenerToken } from 'components/swap/ChartPage'
import { useIsDarkMode } from 'state/user/hooks'
import useLast from 'hooks/useLast'
import useTheme from 'hooks/useTheme'
import { useUSDCValue } from 'hooks/useUSDCPrice'

type Tab = {
    label: string
    active: boolean
    content: JSX.Element
}
type TabsListProps = {
    tabs: Tab[]
    onActiveChanged: (newActive: Tab) => void
}

const ButtonWrapper = styled.div`
display:flex;
justify-content: start;
align-items:center;
column-gap:10px;
`

const FavoriteTokenRow = (
    props: {
        account?: string | null,
        token: any,
        removeFromFavorites: (token: any) => void,
        setTokenModal: (token: any) => void,
        onTokenBalanceLoaded: (tokenBalanceInUsd: number, tokenAddress: string) => void,
        refreshState: { toggled: boolean }
    }
) => {
    const { token, removeFromFavorites, onTokenBalanceLoaded, account, setTokenModal, refreshState } = props
    const currency = useCurrency(toChecksum(token.tokenAddress))
    const currencyBalance = useCurrencyBalance(account ?? undefined, currency ?? undefined)
    const tokenBalanceUsd = useUSDCValue(currencyBalance)
    const pair = useDexscreenerToken(token.tokenAddress)
    const usdcAndEthFormatted = useConvertTokenAmountToUsdString(
        React.useMemo(() => currency as any, [currency]),
        React.useMemo(() => parseFloat(currencyBalance?.toFixed(2) as string), [currencyBalance]),
        React.useMemo(() => ({
            token0: {
                id: pair?.quoteToken?.address || ''
            },
            token1: {
                id: token.tokenAddress
            }
        }), [pair, token]),
        []
    )

    const tokenModal = {
        ...token,
        screenerToken: pair
    }

    const openTokenModal = () => setTokenModal(tokenModal)

    useEffect(() => {
        if (pair?.priceUsd) {
            usdcAndEthFormatted?.refetch()
        }
    }, [pair?.priceUsd])

    useEffect(() => {
        if (refreshState.toggled) {
            usdcAndEthFormatted?.refetch()
        }
    }, [refreshState.toggled])

    useEffect(() => {
        if (usdcAndEthFormatted?.value?.[0]) {
            onTokenBalanceLoaded(+usdcAndEthFormatted?.value?.[0]?.replace(',', ''), token.tokenAddress)
        } else if (tokenBalanceUsd) {
            onTokenBalanceLoaded(+tokenBalanceUsd.toFixed(2), token.tokenAddress)
        }
    }, [usdcAndEthFormatted.value, tokenBalanceUsd])


    const lastUpdated = React.useMemo(() => {
        return _.orderBy(usdcAndEthFormatted?.history ?? [], historyItem => historyItem?.time, 'desc')?.[0]?.time
    }, [usdcAndEthFormatted.history])

    const [updatedTipShown, setUpdatedTipShown] = React.useState(false)

    const unshow = React.useCallback(() => setUpdatedTipShown(false), [])
    const show = React.useCallback(() => setUpdatedTipShown(true), [])

    return (
        <CTableRow align="center" key={token.pairAddress}>
            <CTableDataCell>{token.tokenName}</CTableDataCell>
            <CTableDataCell>{token.tokenSymbol}</CTableDataCell>
            <CTableDataCell>${pair?.priceUsd ?? 'Not available'} / ${abbreviateNumber(pair?.fdv) ?? 'Not available'}</CTableDataCell>
            <CTableDataCell>
                <TYPE.main style={{ alignItems: 'center', display: 'flex' }}>{currencyBalance ? Number(currencyBalance?.toFixed(2)).toLocaleString() + ' ' + token.tokenSymbol + ' / ' : <Loader />}

                    {tokenBalanceUsd && <span style={{ marginLeft: 5 }}> ${Number(tokenBalanceUsd.toFixed(2)).toLocaleString()} USD </span>}

                    {!tokenBalanceUsd && currencyBalance && currencyBalance?.toFixed(0) != '0' && usdcAndEthFormatted && <span style={{ marginLeft: 5 }}>${usdcAndEthFormatted.value[0]} USD</span>}

                    {Boolean(lastUpdated) && <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}><CTooltip placement="auto" content={`Last Updated: ${moment(lastUpdated).fromNow()}`} >
                        <Info size={18} onMouseEnter={show} onMouseLeave={unshow} />
                    </CTooltip> </div>}
                </TYPE.main>
            </CTableDataCell>
            <CTableDataCell>
                <StyledInternalLink to={`/charts/${token.network}/${token.pairAddress}`}>View Chart</StyledInternalLink>
            </CTableDataCell>
            <CTableDataCell>
                <div style={{ display: 'flex', gap: 15, justifyContent: 'space-between', alignItems: 'start' }}>
                    <TYPE.link onClick={openTokenModal}>Swap {token?.tokenSymbol}</TYPE.link>
                    <ButtonError style={{ width: 150, padding: 3 }} onClick={() => removeFromFavorites(token.pairAddress)}>
                        Remove  <MinusCircle />
                    </ButtonError>

                </div>
            </CTableDataCell>
        </CTableRow>
    )
}

export const TabsList = (props: TabsListProps) => {
    const { tabs, onActiveChanged } = props
    const theme = useTheme()
    return (
        <React.Fragment>
            <CNav variant="tabs" role="tablist">
                {tabs?.map(tab => (
                    <CNavItem key={tab.label}>
                        <CNavLink style={{ color: tab.active == false ? theme.text1 : '' }} href={'javascript:void(0);'}
                            active={tab.active}
                            onClick={() => onActiveChanged(tab)}>
                            {tab.label}
                        </CNavLink>
                    </CNavItem>
                ))}
            </CNav>
            <CTabContent>
                {tabs?.filter(a => a.active).map(tab => (
                    <CTabPane key={`tab-pane-${tab.label}`} role="tabpanel" visible={tab.active}>
                        {tab.content}
                    </CTabPane>
                ))}
            </CTabContent>
        </React.Fragment>
    )
}

type TokenAddedPayload = {
    tokenAddress: string
    tokenSymbol: string
    network: string
    pairAddress: string
    tokenName: string
}

export const FavoriteTokensList = () => {
    const [favoriteTokens] = useUserFavoritesManager()
    const { removeFromFavorites, addToFavorites } = useAddPairToFavorites()
    const isDarkMode = useIsDarkMode()
    const favTokens = useMemo(
        () => favoriteTokens || []
        , [favoriteTokens]
    )

    const [refreshState, setRefreshState] = React.useState({
        toggled: false
    })

    const [tokenMap, setTokenMap] = React.useState<Record<string, number>>({})

    const { account } = useActiveWeb3React()

    const tryRefresh = () => {
        setRefreshState({ toggled: true })
        setTimeout(() => {
            setRefreshState({ toggled: false })
        }, 5000)
    }

    const theme = useTheme()
    const [isAddOpen, setIsAddOpen] = React.useState(false)
    const [tokenModal, setTokenModal] = React.useState<any>()
    const dismissToken = React.useCallback(() => setTokenModal(undefined), [])
    const addTokenToFavoritesCb = (token: TokenAddedPayload) => {
        addToFavorites(token.pairAddress, token.network, token.tokenAddress, token.tokenName, token.tokenSymbol)
    }

    const closeAddModal = () => setIsAddOpen(false)
    const openAddModal = () => setIsAddOpen(true)
    const onTokenBalanceLoaded = React.useCallback((tokenBalanceInUsd: number, token: string) => {
        setTokenMap((curr) => ({
            ...curr,
            [token]: tokenBalanceInUsd
        }))
    }, [])

    const totalSumOfTokensOwned = React.useMemo(() => {
        let totalAmountInUsd = 0
        Object.keys(tokenMap).forEach(obj => {
            console.log(`tokenMap`, obj, tokenMap[obj])
            totalAmountInUsd += tokenMap[obj]
        })
        return totalAmountInUsd
    }, [Object.entries(tokenMap)])

    return (
        <DarkCard>
            <SwapTokenForTokenModal item={tokenModal} isOpen={Boolean(tokenModal)} onDismiss={dismissToken} />
            <AddTokenToFavoritesModal onTokenAdded={addTokenToFavoritesCb} isOpen={isAddOpen} onDismiss={closeAddModal} />
            <AutoColumn gap="md">
                <AutoColumn>
                    <CTable caption="top" responsive style={{ color: theme.text1 }} hover={!isDarkMode}>
                        <CTableCaption style={{ color: theme.text1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <TYPE.main>Favorited Tokens</TYPE.main>
                                <ButtonWrapper>
                                    {Boolean(favTokens?.length > 0) && <ButtonConfirmed onClick={tryRefresh} style={{ padding: 3, marginRight: 5, width: 175 }}>Refresh Prices</ButtonConfirmed>}
                                    <ButtonConfirmed onClick={openAddModal} style={{ padding: 3, width: 175 }}>Add Token</ButtonConfirmed>
                                </ButtonWrapper>
                            </div>
                        </CTableCaption>

                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell scope="col">Name</CTableHeaderCell>
                                <CTableHeaderCell scope="col">Symbol</CTableHeaderCell>
                                <CTableHeaderCell scope="col">Price / Market Cap</CTableHeaderCell>
                                <CTableHeaderCell scope="col">Current Balance</CTableHeaderCell>
                                <CTableHeaderCell scope="col">Actions</CTableHeaderCell>

                                <CTableHeaderCell scope="col"></CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {favTokens?.length == 0 && <CTableRow>
                                <CTableDataCell colSpan={5}>Favorite tokens by viewing their chart and clicking the favorite icon to see them here </CTableDataCell>
                            </CTableRow>}
                            {favTokens.map((token) => (
                                <FavoriteTokenRow
                                    refreshState={refreshState}
                                    onTokenBalanceLoaded={onTokenBalanceLoaded}
                                    setTokenModal={setTokenModal}
                                    removeFromFavorites={removeFromFavorites}
                                    token={token}
                                    account={account}
                                    key={`token_row_${token.tokenAddress}`} />
                            ))}
                        </CTableBody>
                        {totalSumOfTokensOwned > 0 && <CTableFoot>
                            <CTableDataCell colSpan={3} />
                            <CTableDataCell colSpan={2}>
                                <strong>Total Owned (USD)</strong> &nbsp; ${totalSumOfTokensOwned.toLocaleString()} USD</CTableDataCell>
                        </CTableFoot>}
                    </CTable>
                </AutoColumn>
            </AutoColumn>
        </DarkCard>
    )
}