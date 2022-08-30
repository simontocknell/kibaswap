import * as ethers from 'ethers'

import Badge, { BadgeVariant } from "components/Badge";
import { BurntKiba, useTotalSwapVolume } from "components/BurntKiba";
import {
  CurrencyAmount,
  Token,
  WETH9,
} from "@uniswap/sdk-core";
import { ExternalLink, StyledInternalLink, TYPE } from "../../theme";
import React, { useEffect, useMemo, useState } from "react";
import { pancakeAbi, pancakeAddress, routerAbi, routerAddress } from "./routerAbi";
import { useDarkModeManager, useUserChartHistoryManager } from "state/user/hooks";

import { AutoColumn } from "../../components/Column";
import { ButtonLight } from "../../components/Button";
import {
  Clock,
} from "react-feather";
import {
  DataCard,
} from "../../components/earn/styled";
import { GreyCard } from "../../components/Card";
import { RowBetween } from "../../components/Row";
import { SupportedChainId } from "constants/chains";
import { SwitchLocaleLink } from "../../components/SwitchLocaleLink";
import { Trans } from "@lingui/macro";
import { Transactions } from "./TransactionsPage";
import { USDC } from "../../constants/tokens";
import Web3 from "web3";
import _ from 'lodash'
import { binanceTokens } from "utils/binance.tokens";
import moment from "moment";
import styled from "styled-components/macro";
import { useActiveWeb3React } from "../../hooks/web3";
import { useBinanceTokenBalance } from "utils/binance.utils";
import useLast from 'hooks/useLast'
import { useTokenBalance } from "../../state/wallet/hooks";
import { useTotalKibaGains } from '../../state/logs/utils'
import { useUserTransactions } from "state/logs/utils";
import { useV2RouterContract } from "hooks/useContract";
import { useWeb3React } from "@web3-react/core";
import { walletconnect } from "connectors";

const PageWrapper = styled(AutoColumn)`
  width: 100%;
`;

const ProposalInfo = styled(AutoColumn)`
  background: ${({ theme }) => theme.bg0};
  border-radius: 30px;
  overflow:hidden;
  padding: 30px;
  position: relative;
  width: 100%;
  min-width: 45%;
  max-width: 480px;
`;

const ArrowWrapper = styled(StyledInternalLink)`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 24px;
  color: ${({ theme }) => theme.text1};

  a {
    color: ${({ theme }) => theme.text1};
    text-decoration: none;
  }
  :hover {
    text-decoration: none;
  }
`;
const CardWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
`;

const StyledDataCard = styled(DataCard)`
  width: 100%;
  background: none;
  background-color: ${({ theme }) => theme.bg1};
  height: fit-content;
  z-index: 2;
`;

const ProgressWrapper = styled.div`
  width: 100%;
  margin-top: 1rem;
  height: 4px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.bg3};
  position: relative;
`;
const ContentWrapper = styled(AutoColumn)`
  width: 100%;
`
const Progress = styled.div<{
  status: "for" | "against";
  percentageString?: string;
}>`
  height: 4px;
  border-radius: 4px;
  background-color: ${({ theme, status }) =>
    status === "for" ? theme.green1 : theme.red1};
  width: ${({ percentageString }) => percentageString};
`;

const MarkDownWrapper = styled.div`
  max-width: 640px;
  overflow: hidden;
`;

const WrapSmall = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    align-items: flex-start;
    flex-direction: column;
  `};
`;

const DetailText = styled.div`
  word-break: break-all;
`;

const ProposerAddressLink = styled(ExternalLink)`
  word-break: break-all;
`;

export const useKiba = (account?: string | null) => {
  const { chainId } = useWeb3React()
  const isBinance = React.useMemo(() => chainId === SupportedChainId.BINANCE, [chainId]);
  const kibaCoin = React.useMemo(() => new Token(
    isBinance ? 56 : 1,
    isBinance ? '0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5' : "0x005d1123878fc55fbd56b54c73963b234a64af3c",
    18,
    "Kiba",
    "Kiba Inu"
  ), [isBinance])


  const kiba: CurrencyAmount<Token> | undefined = useTokenBalance(
    account ?? undefined,
    kibaCoin
  );



  const bKiba = useBinanceTokenBalance('0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5', account, chainId)

  return React.useMemo(() => {
    return isBinance && bKiba?.balance ? +bKiba.balance.toFixed(0) : kiba;
  }, [kiba, account, isBinance, bKiba.balance]);
};

export const useRouterABI = () => {
  const { chainId } = useWeb3React()
  const isBinance = React.useMemo(() => chainId === SupportedChainId.BINANCE, [chainId]);
  const router = useV2RouterContract(chainId)
  const { routerADD, routerABI } = React.useMemo(() => {
    return isBinance ? {
      routerADD: pancakeAddress,
      routerABI: pancakeAbi
    } : { routerADD: routerAddress, routerABI: routerAbi }
  }, [isBinance])
  return { isBinance, routerABI, routerADD, router }
}

/** 
 * @description converts the given token to subsequent usdc value
 * @param token token to convert to usdc
 * @param amt amount of token to convert to usdc
 * @returns Formatted USD string
 */
export const useConvertTokenAmountToUsdString = (token?: Token, amt?: number, pair?: { token0?: { id: string }, token1?: { id: string } }, txData?: any) => {
  const { chainId } = useWeb3React()
  const [retrieving, setRetrieving] = React.useState(false)
  const [history,updateUserChartHistory] = useUserChartHistoryManager()
  const length = useLast(txData?.[0]?.timestamp)
  const [value, setValue] = React.useReducer(function (state: { value: string[], history: any[] }, action: { type: string, payload: { data: string[], token?: Token } }) {
    switch (action.type) {
      case 'update':
        const newHistory = [...state.history, {
          time: new Date().getTime(),
          summary: Boolean(token?.symbol) ? `Updating ${token?.symbol} ${amt} holdings conversion to USD` : `Clearing state`,
          data: action.payload.data,
          token: token
        }]
   

        if (Boolean(token?.symbol && !!action.payload.data.length)) {
        
          return {
            ...state,
            value: action.payload.data,
            //create a new history entry.
            history: newHistory
          }
        } else if (!Boolean(!action.payload.data.length && token?.symbol)) {
          // keep history | clear value
          return {
            ...state,
            value: []
          }
        } else {
          return state
        }
      default:
        return state
    }
  }, {
    value: [],
    history: []
  })
  const router = useV2RouterContract(chainId)
  const lastToken = useLast(token)
  const retrieveTokenValue = React.useCallback(async (): Promise<any | undefined> => {
    if (retrieving) {
      console.log(`already running, return`)
      return
    }
    setRetrieving(true)
    return new Promise((resolve) => {
      try {
        const returnCondition = amt && +amt <= 0
        if (!token || !amt || amt == 0 || !router || returnCondition) {
          setValue({ type: 'update', payload: { data: [], token: token } });
          setRetrieving(false)
          return resolve([])
        }
        if (token && amt && +amt.toFixed(0) > 0) {
          const multiplier = 10 ** token.decimals;
          const amount = parseFloat(amt.toFixed(0)) * multiplier;
          const pairAddress = (pair?.token0?.id?.toLowerCase() == token?.address?.toLowerCase() ? pair?.token1?.id : pair?.token0?.id) || WETH9[1].address;
          if (pairAddress && amount > 0 && router) {
            const swapRoute = [
              token.address,
              pairAddress,
            ]

            // position of ETH in the return array
            let ethPosition = 1
            // ensure we aren't adding USDC if the token they want's amount is already paired with USDC
            if (pairAddress?.toLowerCase() !== USDC.address?.toLowerCase()) {
              swapRoute.push(USDC.address)
            } else {
              swapRoute.push(WETH9[1].address)
              ethPosition = 2
            }

            router?.getAmountsOut(BigInt(amount), swapRoute).then((response: any) => {
              let usdc: any, eth: any;
              if (ethPosition == 1) {
                eth = response[1]
                usdc = response[response.length - 1]
              } else if (ethPosition == 2) {
                eth = response[response.length - 1]
                usdc = response[1]
              }

              const formattedEth = parseFloat(ethers.utils.formatEther(eth)).toFixed(6) + 'Ξ'
              const ten6 = 10 ** 6 // usdc has 6 decimals
              const usdcValue = usdc / ten6;
              const number = Number(usdcValue.toFixed(2))
              console.log(`get amounts out result formatted: ${number.toLocaleString()}`)
              const formatted = `${number.toLocaleString()}`
              const value = [formatted, formattedEth]
              setValue({ type: 'update', payload: { data: value, token } });
              setRetrieving(false)

              return resolve(value)
            }).catch(() => {
              setRetrieving(false)
              console.error(`Ran Into Issue when fetching router anmounts`)
            })
          }
        } else {
          setRetrieving(false)

          setValue({ type: 'update', payload: { data: [], token: token } });
          return resolve([])
        }

      } catch (ex) {
        console.error(ex);
        setRetrieving(false)

        return resolve([])
      }
    })
  }, [token, pair, router, amt])

  const lastTx = txData?.[0]?.timestamp
  const tokenAddress = token?.address
  const changed = Boolean(token && lastToken && lastToken.address.toLowerCase() != token.address.toLowerCase()) || Boolean(txData?.length) && Boolean((txData?.[0]?.timestamp != length))
  const hasTokenHistory = value?.history?.some((item) => Boolean(item?.token?.address?.toLowerCase() == (token?.address?.toLowerCase())) && Boolean(item.time))
  if (hasTokenHistory) console.log(`latest history`, value.history.filter(a => a?.token?.address == token?.address && a?.time > 0))
  React.useEffect(() => {
    if (!amt || amt <= 0) {
      console.log(`._LOGGER_. | token amount is 0. No point in checking value. returning`)
      return
    }
    if (retrieving) {
      console.log(`._LOGGER_. | still retrieving`)
      return
    }

    if ((hasTokenHistory && !changed && Boolean(lastTx) && Boolean(length) && _.isEqual(lastTx, length))) {
      console.log(`._LOGGER_. | has history and has not changed returning`)
      return
    }

    console.log(`._LOGGER_. | we running this effect now.`)
    retrieveTokenValue()
  }, [txData, amt, changed, token, lastTx, tokenAddress, hasTokenHistory]);

  return { value: value.value, refetch: retrieveTokenValue, history: value.history }
}


export const useKibaBalanceUSD = (account?: string, chainId?: number) => {
  const kibaBalance = useKiba(account)
  const { library } = useWeb3React()
  const [kibaBalanceUSD, setKibaBalanceUSD] = React.useState('')
  const { routerADD, isBinance, routerABI, router } = useRouterABI();
  const kibaCoin = new Token(
    isBinance ? 56 : 1,
    isBinance ? '0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5' : "0x005d1123878fc55fbd56b54c73963b234a64af3c",
    isBinance ? 18 : 18,
    "Kiba",
    "Kiba Inu"
  );
  React.useEffect(() => {
    try {
      if (kibaBalance && +kibaBalance < 0) {
        setKibaBalanceUSD("-");
        return;
      }
      if (kibaBalance && +kibaBalance.toFixed(0) > 0) {
        const ten9 = 10 ** 18;
        const amount = +kibaBalance.toFixed(0) * ten9;
        if (amount > 0 && router) {
          router?.getAmountsOut(BigInt(amount), [
            kibaCoin.address,
            isBinance ? binanceTokens.wbnb.address : WETH9[1].address,
            isBinance ? binanceTokens.busd.address : USDC.address,
          ]).then((response: any) => {
            const usdc = response[response.length - 1];
            const ten6 = isBinance ? 10 ** 18 : 10 ** 6;
            const usdcValue = usdc / ten6;
            const number = Number(usdcValue.toFixed(2));
            setKibaBalanceUSD(number.toLocaleString());
          });
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  }, [kibaBalance, account, routerABI, routerADD, kibaCoin.address, isBinance]);
  return kibaBalanceUSD
}

export const useTotalSwapVolumeBnbToUsd = function () {
  const {
    volumeInEth
  } = useTotalSwapVolume()
  const {
    library
  } = useWeb3React()
  const { routerADD, routerABI } = React.useMemo(() => {
    return {
      routerADD: pancakeAddress,
      routerABI: pancakeAbi
    }
  }, [])
  const [volumeInUsd, setVolumeInUsd] = React.useState('0')
  React.useEffect(() => {
    try {
      if (volumeInEth && +volumeInEth < 0) {
        return;
      }
      if (volumeInEth && parseFloat(volumeInEth) > 0) {
        const provider = window.ethereum ? window.ethereum : library?.provider
        if (!provider) return;
        const w3 = new Web3(provider as any).eth;
        const routerContr = new w3.Contract(routerABI as any, routerADD);
        const ten9 = 10 ** 18;
        const amount = parseFloat((parseFloat(volumeInEth) * ten9).toFixed(0))
        if (amount > 0) {
          const amountsOut = routerContr.methods.getAmountsOut(BigInt(amount), [
            binanceTokens.wbnb.address,
            binanceTokens.busd.address,
          ]);
          amountsOut.call().then((response: any) => {
            const usdc = response[response.length - 1];
            const ten6 = 10 ** 18;
            const usdcValue = usdc / ten6;
            const number = Number(usdcValue.toFixed(2));
            if (volumeInUsd !== number.toLocaleString())
              setVolumeInUsd(number.toLocaleString());
          });
        }
      }
    } catch (ex) {
      console.error(ex);
    }
  }, [library, volumeInEth]);
  return [volumeInUsd, setVolumeInUsd]
}

export const useKibaRefreshedBinance = (account?: string | null, chainId?: number) => {
  const isBinance = React.useMemo(() => chainId === SupportedChainId.BINANCE, [chainId]);
  const kibaCoin = React.useMemo(() => new Token(
    1,
    isBinance ? '0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5' : "0x005d1123878fc55fbd56b54c73963b234a64af3c",
    18,
    "Kiba",
    "Kiba Inu"
  ), [isBinance])

  const kiba: CurrencyAmount<Token> | undefined = useTokenBalance(
    account ?? undefined,
    kibaCoin
  );

  const bKiba = useBinanceTokenBalance('0xc3afde95b6eb9ba8553cdaea6645d45fb3a7faf5', account, chainId)

  return React.useMemo(() => {
    return isBinance && bKiba?.balance ? +bKiba.balance.toFixed(0) : kiba;
  }, [kiba, isBinance, bKiba.balance]);
};
export const useStimulusBalance = (account?: string | null) => {
  const stimulusCoin = new Token(
    1,
    "0x4d7beb770bb1c0ac31c2b3a3d0be447e2bf61013",
    9,
    "StimulusCheck",
    "StimulusCheck Token"
  );

  const stimulusBalance: CurrencyAmount<Token> | undefined = useTokenBalance(
    account ?? undefined,
    stimulusCoin
  );

  return React.useMemo(() => {
    return stimulusBalance ? stimulusBalance : undefined;
  }, [stimulusCoin, stimulusBalance]);
};


const GainsText = styled(TYPE.white)`
font-size:22px;
font-family:'Bangers', cursive;`

export default function VotePage() {
  const { account, chainId } = useActiveWeb3React();
  const kibaBalance = useKibaRefreshedBinance(account, chainId)
  const kibaBalanceUSD = useKibaBalanceUSD(account ?? undefined, chainId)

  return (
    <>
      <PageWrapper gap="lg" justify="center">
        <ProposalInfo>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '2rem' }}>
            <GainsText style={{ display: 'flex', alignItems: 'center', fontSize: 32 }}>KibaStats
              <Badge style={{ marginLeft: 10, marginTop: -2 }} variant={BadgeVariant.DEFAULT}>
                <GainsText>Beta</GainsText>
              </Badge>
            </GainsText>
          </div>
          <AutoColumn gap="50px">
            <div style={{ display: "flex", alignItems: 'center', flexFlow: "row wrap" }}>
              {!account && (
                <TYPE.white>
                  <Trans>
                    Please connect wallet to start tracking your account.
                  </Trans>
                </TYPE.white>
              )}
              <div style={{ display: 'flex', flexFlow: 'column wrap', alignItems: "center" }}>
                <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <TYPE.white>
                    <Trans>
                      {kibaBalance !== undefined
                        && (+(kibaBalance) > 0 || +kibaBalance?.toFixed(0) > 0)
                        ? <div style={{ alignItems: 'center', marginBottom: 10, display: 'flex' }}><GainsText style={{ marginRight: 10 }}>Your Kiba Balance</GainsText> <span style={{ fontSize: 18 }}> {Number(kibaBalance?.toFixed(2)).toLocaleString()} <Badge variant={BadgeVariant.POSITIVE}>(${(kibaBalanceUSD)} USD) </Badge></span></div>
                        : null}
                    </Trans>
                  </TYPE.white>
                </div>
                <div style={{ display: 'block', width: '100%' }}>
                  <BurntKiba showDetails />
                </div>
              </div>
            </div>
          </AutoColumn>
          <br />
        </ProposalInfo>
      </PageWrapper>
      <SwitchLocaleLink />
    </>
  );
}
