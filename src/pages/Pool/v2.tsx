import { ButtonOutlined, ButtonPrimary, ButtonSecondary } from '../../components/Button'
import { CardBGImage, CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import { ExternalLink, HideSmall, TYPE } from '../../theme'
import { RowBetween, RowFixed } from '../../components/Row'
import styled, { ThemeContext } from 'styled-components/macro'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../../state/user/hooks'
import { useContext, useMemo } from 'react'

import { AutoColumn } from '../../components/Column'
import { BIG_INT_ZERO } from '../../constants/misc'
import Card from '../../components/Card'
import { ChevronsRight } from 'react-feather'
import { Dots } from '../../components/swap/styleds'
import FullPositionCard from '../../components/PositionCard'
import JSBI from 'jsbi'
import { L2_CHAIN_IDS } from 'constants/chains'
import { Link } from 'react-router-dom'
import { Pair } from 'custom-uniswap-v2-sdk'
import { SwapPoolTabs } from '../../components/NavigationTabs'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import { Text } from 'rebass'
import { Trans } from '@lingui/macro'
import { useActiveWeb3React } from '../../hooks/web3'
import { useStakingInfo } from '../../state/stake/hooks'
import { useTokenBalancesWithLoadingIndicator } from '../../state/wallet/hooks'
import { useV2Pairs } from '../../hooks/useV2Pairs'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
  background: ${props => props.theme.bg0};
  color:${props => props.theme.text1};
  padding:9px 14px;
  border-radius:30px;
`

const VoteCard = styled(DataCard)`
  background: ${props => props.theme.bg1};
  color:${props => props.theme.text1};
  overflow: hidden;
`

const TitleRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-wrap: wrap;
    gap: 12px;
    width: 100%;
    flex-direction: column-reverse;
    color:${props => props.theme.text1};
  `};
`

const ButtonRow = styled(RowFixed)`
  gap: 8px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%;
    flex-direction: row-reverse;
    justify-content: space-between;
  `};
`

const ResponsiveButtonPrimary = styled(ButtonPrimary)`
  width: fit-content;
  border-radius: 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 48%;
  `};
`

const ResponsiveButtonSecondary = styled(ButtonSecondary)`
  width: fit-content;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 48%;
  `};
`

const EmptyProposals = styled.div`
  border: 1px solid ${({ theme }) => theme.text4};
  padding: 16px 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background:${props => props.theme.bg0};
  color:${props => props.theme.primary2};
`

export const Layer2Prompt = styled(EmptyProposals)`
  margin-top: 16px;
`

export default function Pool() {
  const theme = useContext(ThemeContext)
  const { account, chainId } = useActiveWeb3React()

  // fetch the user's balances of all tracked V2 LP tokens
  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens = useMemo(
    () => trackedTokenPairs.map((tokens) => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )
  const liquidityTokens = useMemo(
    () => tokenPairsWithLiquidityTokens.map((tpwlt) => tpwlt.liquidityToken),
    [tokenPairsWithLiquidityTokens]
  )
  const [v2PairsBalances, fetchingV2PairBalances] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    liquidityTokens
  )

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.filter(({ liquidityToken }) =>
        v2PairsBalances[liquidityToken.address]?.greaterThan('0')
      ),
    [tokenPairsWithLiquidityTokens, v2PairsBalances]
  )

  const v2Pairs = useV2Pairs(liquidityTokensWithBalances.map(({ tokens }) => tokens))
  const v2IsLoading =
    fetchingV2PairBalances || v2Pairs?.length < liquidityTokensWithBalances.length || v2Pairs?.some((V2Pair) => !V2Pair)

  const allV2PairsWithLiquidity = v2Pairs.map(([, pair]) => pair).filter((v2Pair): v2Pair is Pair => Boolean(v2Pair))

  // show liquidity even if its deposited in rewards contract
  const stakingInfo = useStakingInfo()
  const stakingInfosWithBalance = stakingInfo?.filter((pool) =>
    JSBI.greaterThan(pool.stakedAmount.quotient, BIG_INT_ZERO)
  )
  const stakingPairs = useV2Pairs(stakingInfosWithBalance?.map((stakingInfo) => stakingInfo.tokens))

  // remove any pairs that also are included in pairs with stake in mining pool
  const v2PairsWithoutStakedAmount = allV2PairsWithLiquidity.filter((v2Pair) => {
    return (
      stakingPairs
        ?.map((stakingPair) => stakingPair[1])
        .filter((stakingPair) => stakingPair?.liquidityToken.address === v2Pair.liquidityToken.address).length === 0
    )
  })

  const ON_L2 = chainId && L2_CHAIN_IDS.includes(chainId)

  return (
    <>
      <PageWrapper>
        <SwapPoolTabs active={'pool'} />
        <VoteCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.main fontWeight={600}>
                  <Trans>Liquidity provider rewards</Trans>
                </TYPE.main>
              </RowBetween>
              <RowBetween>
                <TYPE.main fontSize={14}>
                  <Trans>
                    Liquidity providers earn a 0.3% fee on all trades proportional to their share of the pool. Fees are
                    added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.
                  </Trans>
                </TYPE.main>
              </RowBetween>
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                target="_blank"
                href="https://uniswap.org/docs/v2/core-concepts/pools/"
              >
                <TYPE.main fontSize={14}>
                  <Trans>Read more about providing liquidity</Trans>
                </TYPE.main>
              </ExternalLink>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </VoteCard>

        {ON_L2 ? (
          <AutoColumn gap="lg" justify="center">
            <AutoColumn gap="md" style={{ width: '100%' }}>
              <Layer2Prompt>
                <TYPE.body color={theme.text3} textAlign="center">
                  <Trans>V2 is not available on Layer 2. Switch to Layer 1 Ethereum.</Trans>
                </TYPE.body>
              </Layer2Prompt>
            </AutoColumn>
          </AutoColumn>
        ) : (
          <AutoColumn gap="lg" justify="center">
            <AutoColumn gap="md" style={{ width: '100%' }}>
              <TitleRow style={{  marginTop: '1rem' }} padding={'0'}>
                <HideSmall>
                  <TYPE.mediumHeader  style={{ marginTop: '0.5rem', justifySelf: 'flex-start' }}>
                    <Trans>Your V2 liquidity</Trans>
                  </TYPE.mediumHeader>
                </HideSmall>
                <ButtonRow>
                  <ResponsiveButtonSecondary style={{}} as={Link} padding="6px 8px" to="/add/v2/ETH">
                    <Trans>Create a pair</Trans>
                  </ResponsiveButtonSecondary>
                  <ResponsiveButtonPrimary id="find-pool-button" as={Link} to="/pool/v2/find" padding="6px 8px">
                    <Text fontWeight={500} fontSize={16}>
                      <Trans>Import Pool</Trans>
                    </Text>
                  </ResponsiveButtonPrimary>
                  <ResponsiveButtonPrimary  id="join-pool-button" as={Link} to="/add/v2/ETH" padding="6px 8px">
                    <Text fontWeight={500} fontSize={16}>
                      <Trans>Add V2 Liquidity</Trans>
                    </Text>
                  </ResponsiveButtonPrimary>
                </ButtonRow>
              </TitleRow>

              {!account ? (
                <Card padding="40px">
                  <TYPE.white  color={theme.text3}  textAlign="center">
                    <Trans>Connect to a wallet to view your liquidity.</Trans>
                  </TYPE.white>
                </Card>
              ) : v2IsLoading ? (
                <EmptyProposals>
                  <TYPE.white  color={theme.text3}  textAlign="center">
                    <Dots>
                      <Trans>Loading</Trans>
                    </Dots>
                  </TYPE.white>
                </EmptyProposals>
              ) : allV2PairsWithLiquidity?.length > 0 || stakingPairs?.length > 0 ? (
                <>
                  <ButtonSecondary>
                    <RowBetween>
                      <Trans>
                        <ExternalLink href={'https://v2.info.uniswap.org/account/' + account}>
                          Account analytics and accrued fees
                        </ExternalLink>
                        <span> ↗ </span>
                      </Trans>
                    </RowBetween>
                  </ButtonSecondary>
                  {v2PairsWithoutStakedAmount.map((v2Pair) => (
                    <FullPositionCard key={v2Pair.liquidityToken.address} pair={v2Pair} />
                  ))}
                  {stakingPairs.map(
                    (stakingPair, i) =>
                      stakingPair[1] && ( // skip pairs that arent loaded
                        <FullPositionCard
                          key={stakingInfosWithBalance[i].stakingRewardAddress}
                          pair={stakingPair[1]}
                          stakedBalance={stakingInfosWithBalance[i].stakedAmount}
                        />
                      )
                  )}
                  <RowFixed justify="center" style={{ width: '100%' }}>
                    <ButtonOutlined
                      as={Link}
                      to="/migrate/v2"
                      id="import-pool-link"
                      style={{
                        padding: '8px 16px',
                        margin: '0 4px',
                        borderRadius: '12px',
                        width: 'fit-content',
                        fontSize: '14px',
                      }}
                    >
                      <ChevronsRight size={16} style={{ marginRight: '8px' }} />
                      <Trans>Migrate Liquidity to V3</Trans>
                    </ButtonOutlined>
                  </RowFixed>
                </>
              ) : (
                <EmptyProposals>
                  <TYPE.white color={theme.text3} textAlign="center">
                    <Trans>No liquidity found.</Trans>
                  </TYPE.white>
                </EmptyProposals>
              )}
            </AutoColumn>
          </AutoColumn>
        )}
      </PageWrapper>
      <SwitchLocaleLink />
    </>
  )
}
