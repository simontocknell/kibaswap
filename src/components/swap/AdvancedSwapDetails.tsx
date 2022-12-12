import { Trans } from '@lingui/macro'
import { Percent, Currency, TradeType, CurrencyAmount, Fraction } from '@uniswap/sdk-core'
import { Trade as V2Trade } from 'custom-uniswap-v2-sdk'
import { Trade as V3Trade } from '@uniswap/v3-sdk'
import { useContext, useMemo } from 'react'
import { ThemeContext } from 'styled-components/macro'
import { TYPE } from '../../theme'
import { computeRealizedLPFeePercent } from '../../utils/prices'
import { AutoColumn } from '../Column'
import { RowBetween, RowFixed } from '../Row'
import FormattedPriceImpact from './FormattedPriceImpact'
import SwapRoute from './SwapRoute'
import { useActiveWeb3React } from 'hooks/web3'
import { SupportedChainId } from 'constants/chains'
import JSBI from 'jsbi'
import { useTransactionSettingStore } from 'stores/transactionSetting'
import React from 'react'
import useWallet from "../../useWallet";
import { getTokenSymbol } from 'utils/tokens'

const ZERO_PERCENT = new Percent("0");

const ONE_HUNDRED_PERCENT = new Percent("1");

const INPUT_FRACTION_AFTER_FEES: { [chainId: number]: Percent } = {
  [SupportedChainId.BINANCE]: ONE_HUNDRED_PERCENT.subtract(
    new Percent(JSBI.BigInt(25), JSBI.BigInt(10000))
  ),
  [SupportedChainId.MAINNET]: ONE_HUNDRED_PERCENT.subtract(
    new Percent(JSBI.BigInt(30), JSBI.BigInt(10000))
  ),
  [SupportedChainId.ARBITRUM_ONE]: ONE_HUNDRED_PERCENT.subtract(
    new Percent(JSBI.BigInt(30), JSBI.BigInt(10000))
  ),
};

interface AdvancedSwapDetailsProps {
  trade?: V2Trade<Currency, Currency, TradeType> | V3Trade<Currency, Currency, TradeType>
  allowedSlippage: Percent
}

export function AdvancedSwapDetails({ trade, allowedSlippage }: AdvancedSwapDetailsProps) {
  const theme = useContext(ThemeContext)
  const { chainId } = useActiveWeb3React();

  const { realizedLPFee, priceImpact } = useMemo(() => {
    if (!trade) return { realizedLPFee: undefined, priceImpact: undefined }

    const realizedLpFeePercent = computeRealizedLPFeePercent(trade)
    const realizedLPFee = trade.inputAmount.multiply(realizedLpFeePercent)
    const priceImpact = trade.priceImpact.subtract(realizedLpFeePercent)
    return { priceImpact, realizedLPFee }
  }, [trade])

  return !trade ? null : (
    <AutoColumn gap="8px">
      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
            <Trans>Liquidity Provider Fee</Trans>
          </TYPE.black>
        </RowFixed>
        <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
          {realizedLPFee ? `${realizedLPFee.toSignificant(4)} ${realizedLPFee.currency.symbol}` : '-'}
        </TYPE.black>
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
            <Trans>Route</Trans>
          </TYPE.black>
        </RowFixed>
        <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
          <SwapRoute trade={trade} />
        </TYPE.black>
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
            <Trans>Price Impact</Trans>
          </TYPE.black>
        </RowFixed>
        <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
          <FormattedPriceImpact priceImpact={priceImpact} />
        </TYPE.black>
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
            {trade.tradeType === TradeType.EXACT_INPUT ? <Trans>Minimum received</Trans> : <Trans>Maximum sent</Trans>}
          </TYPE.black>
        </RowFixed>
        <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
          {trade.tradeType === TradeType.EXACT_INPUT
            ? `${trade.minimumAmountOut(allowedSlippage).toSignificant(6)} ${trade.outputAmount.currency.symbol}`
            : `${trade.maximumAmountIn(allowedSlippage).toSignificant(6)} ${trade.inputAmount.currency.symbol}`}
        </TYPE.black>
      </RowBetween>

      <RowBetween>
        <RowFixed>
          <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
            <Trans>Slippage tolerance</Trans>
          </TYPE.black>
        </RowFixed>
        <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
          {allowedSlippage.toFixed(2)}%
        </TYPE.black>
      </RowBetween>
    </AutoColumn>
  )
}

export function computeSlippageAdjustedAmounts(
  trade: V2Trade<Currency, Currency, TradeType> 
  | V3Trade<Currency, Currency, TradeType> 
  | undefined 
  | null,
  allowedSlippage: number
): { INPUT?: CurrencyAmount<Currency>; OUTPUT?: CurrencyAmount<Currency> } {
  function basisPointsToPercent(num: number): Percent {
    return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000));
  }
  const pct = basisPointsToPercent(allowedSlippage);
  return {
    INPUT: trade?.maximumAmountIn(pct),
    OUTPUT: trade?.minimumAmountOut(pct),
  };
}
export function computeRealizedLPFeePercent2(
  trade: V2Trade<Currency, Currency, TradeType>,
  fractionAfterFee: Percent
): Percent {
  const percent: Percent = ONE_HUNDRED_PERCENT.subtract(
    trade.route.pairs.reduce<Percent>(
      (currentFee: Percent): Percent => currentFee.multiply(fractionAfterFee),
      ONE_HUNDRED_PERCENT
    )
  );

  return new Percent(percent.numerator, percent.denominator);
}
export function computeTradePriceBreakdown(
  trade: V2Trade<Currency, Currency, TradeType> | null | undefined,
  fractionAfterFee: Percent
): {
  priceImpactWithoutFee: Percent | undefined;
  realizedLPFee: CurrencyAmount<Currency> | undefined | null;
} {
  // for each hop in our trade, take away the x*y=k price impact from 0.3% fees
  // e.g. for 3 tokens/2 hops: 1 - ((1 - .03) * (1-.03))
  const realizedLPFee = !trade
    ? undefined
    : ONE_HUNDRED_PERCENT.subtract(
        trade.route.pairs.reduce<Fraction>(
          (currentFee: Fraction): Fraction =>
            currentFee.multiply(fractionAfterFee),
          ONE_HUNDRED_PERCENT
        )
      );

  // remove lp fees from price impact
  const priceImpactWithoutFeeFraction =
    trade && realizedLPFee
      ? trade.priceImpact.subtract(realizedLPFee)
      : undefined;

  // the x*y=k impact
  const priceImpactWithoutFeePercent = priceImpactWithoutFeeFraction
    ? new Percent(
        priceImpactWithoutFeeFraction?.numerator,
        priceImpactWithoutFeeFraction?.denominator
      )
    : undefined;

  // the amount of the input that accrues to LPs
  const realizedLPFeeAmount =
    realizedLPFee &&
    trade &&
    CurrencyAmount.fromRawAmount(
      trade.inputAmount.currency,
      realizedLPFee.multiply(trade.inputAmount).quotient
    );

  return {
    priceImpactWithoutFee: priceImpactWithoutFeePercent,
    realizedLPFee: realizedLPFeeAmount,
  };
}
export function AdvancedSwapDetails2(data: {
  trade:
    | V2Trade<Currency, Currency, TradeType.EXACT_OUTPUT | TradeType.EXACT_INPUT> 
    | undefined
    | null;
}) {
  const { chainId } = useWallet();

  const { trade } = data;

  const { slippageTolerance } = useTransactionSettingStore();

  const slippageAdjustedAmounts = React.useMemo(
    () => computeSlippageAdjustedAmounts(trade, slippageTolerance),
    [slippageTolerance, trade]
  );

  const { realizedLPFee } = useMemo(
    () => computeTradePriceBreakdown(trade, INPUT_FRACTION_AFTER_FEES[chainId]),
    [trade, chainId]
  );

  const { priceImpact: priceImpactPer } = useMemo(() => {
    if (!trade) return { realizedLPFee: undefined, priceImpact: undefined };

    const realizedLpFeePercent = computeRealizedLPFeePercent2(
      trade,
      INPUT_FRACTION_AFTER_FEES[chainId]
    );
    const realizedLPFee = trade.inputAmount.multiply(realizedLpFeePercent);
    const priceImpact = trade.priceImpact.subtract(realizedLpFeePercent);
    return { priceImpact, realizedLPFee };
  }, [trade, chainId]);

  const receivedTitle =
    trade?.tradeType === TradeType.EXACT_INPUT
      ? "Minimum received"
      : "Maximum sent";

  const received =
    trade?.tradeType === TradeType.EXACT_INPUT
      ? slippageAdjustedAmounts["OUTPUT"]?.toSignificant(4) ?? "-"
      : slippageAdjustedAmounts["INPUT"]?.toSignificant(4) ?? "-";

  const receivedSymbol =
    trade?.tradeType === TradeType.EXACT_INPUT
      ? getTokenSymbol(trade.outputAmount.currency, chainId)
      : getTokenSymbol(trade?.inputAmount.currency, chainId);

  const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000));

  const priceImpact = priceImpactPer
    ? priceImpactPer.lessThan(ONE_BIPS)
      ? "<0.01%"
      : `${priceImpactPer.multiply(-1).toFixed(2)}%`
    : "-";

  const fee = realizedLPFee
    ? `${realizedLPFee?.toSignificant(6)} ${
        trade?.inputAmount.currency.wrapped.symbol
      }`
    : "-";

  return {
    receivedTitle,
    received,
    receivedSymbol: receivedSymbol || "--",
    priceImpact,
    fee,
    route: trade?.route.path.reduce((c, t, i, a) => {
      return `${c} ${t.symbol} ${i !== a.length - 1 ? ">" : ""}`;
    }, ""),
  };
}