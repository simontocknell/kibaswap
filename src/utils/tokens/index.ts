import { Currency } from "@uniswap/sdk-core";
import { CHAIN_INFO } from "constants/chains";

export function getTokenSymbol(
  token: Currency | undefined,
  chainId: number
): string | undefined {
  if (!token) {
    return "";
  }

  if (token?.isNative) {
    return CHAIN_INFO[chainId]?.label;
  }

  return token.symbol;
}
