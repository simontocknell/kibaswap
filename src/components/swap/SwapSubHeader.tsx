import { Percent } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { GasIcon } from 'components/AndyComponents/icons'
import GasSelectorModal from 'components/GasSelectorModal'
import React, { useContext } from 'react'
import { ArrowUpRight } from 'react-feather'
import styled, { ThemeContext } from 'styled-components/macro'
import { RowBetween, RowFixed } from '../Row'
import SettingsTab from '../Settings'


const StyledSwapHeader = styled.div`
  padding: 30px 45px 10px 45px;
  width: 100%;
  color: ${({ theme }) => theme.text1};
  background: ${({ theme }) => theme.bg0};
`


export default function SwapSubHeader({ allowedSlippage }: { allowedSlippage: Percent }) {
const theme = useContext(ThemeContext)
const [gasSettingsOpen, setGasSettingsOpen] = React.useState(false);
const openGasSettings = () => setGasSettingsOpen(true)
const closeGasSettings = () => setGasSettingsOpen(false)
  return (
    <StyledSwapHeader>
      <RowBetween>
        <RowFixed>
      <GasSelectorModal isOpen={gasSettingsOpen} onDismiss={closeGasSettings} />

               <small style={{ color: theme.text1, cursor: 'pointer', display: 'flex', marginBottom: 0, alignItems: 'center', justifyContent: 'flex-end' }} onClick={openGasSettings}> <GasIcon height={16} width={16} /></small>
        </RowFixed>
        <RowFixed>
          <SettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed>
      </RowBetween>
    </StyledSwapHeader>
  )
}
