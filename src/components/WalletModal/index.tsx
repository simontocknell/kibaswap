import * as styles from './WalletDropdown.css'



import { ExternalLink, TYPE } from '../../theme'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import { fortmatic, injected, portis } from '../../connectors'
import { ForwardedRef, forwardRef, ReactNode, useContext, useEffect, useReducer, useRef, useState } from 'react'
import { useModalOpen, useWalletModalToggle } from '../../state/application/hooks'
import { AbstractConnector } from '@web3-react/abstract-connector'
import AccountDetails from '../AccountDetails'
import { ApplicationModal } from '../../state/application/actions'
import { AutoRow } from 'components/Row'
import { ReactComponent as Close } from '../../assets/images/x.svg'
import { LightCard } from '../Card'
import MetamaskIcon from '../../assets/images/metamask.png'
import Modal from '../Modal'
import { OVERLAY_READY } from '../../connectors/Fortmatic'
import Option from './Option'
import PendingView from './PendingView'
import QuestionHelper from 'components/QuestionHelper'
import ReactGA from 'react-ga'
import { SUPPORTED_WALLETS } from '../../constants/wallet'
import { Trans } from '@lingui/macro'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { flex } from 'styled-system'
import styled, { css, ThemeContext } from 'styled-components/macro'
import usePrevious from '../../hooks/usePrevious'
import { Box, BoxProps } from 'components/AndyComponents/Box'
import { NavLink, NavLinkProps } from 'react-router-dom'
import { Column, FlRow } from 'components/AndyComponents/Flex'
import { body } from 'components/AndyComponents/common.css'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import { useIsMobileSp } from 'components/AndyComponents/AndyHooks'
import { isMobile } from 'react-device-detect'


const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 14px;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const CloseColor = styled(Close)`
color:${props => props.theme.text1};
  path {
    stroke: ${({ theme }) => theme.text1};
  }
`



const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 20px 30px 10px 30px;
  font-weight: 600;
  font-family: 'Open Sans';
  color:${(props) => props.theme.text1};
  background:${props => props.theme.bg0};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`


const WalletDropdown = forwardRef((props: BoxProps, ref: ForwardedRef<HTMLElement>) => {
  const isMobileW = useIsMobileSp()
  return <Box ref={ref} className={isMobileW ? styles.mobileNavDropdownTop : styles.NavDropdown} {...props} />
})

WalletDropdown.displayName = 'WalletDropdown'


const ContentWrapper = styled.div`
  background: transparent;
  padding: 10px;

`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.25rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const OptionGrid = styled.div`
  display: grid;
  grid-gap: 10px;
`
export enum FlyoutAlignment {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}












const WALLET_VIEWS = {
  OPTIONS: 'options',
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending',
}

export default function WalletModal({
  pendingTransactions,
  confirmedTransactions,
  ENSName,
}: {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}) {
  // important that these are destructed from the account-specific web3-react context
  const { active, account, connector, activate, error } = useWeb3React()
  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)
  const previousWalletView = usePrevious(walletView)
  const [pendingWallet, setPendingWallet] = useState<AbstractConnector | undefined>()
  const [pendingError, setPendingError] = useState<boolean>()
  const walletModalOpen = useModalOpen(ApplicationModal.WALLET)
  const toggleWalletModal = useWalletModalToggle()
  const previousAccount = usePrevious(account)
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, walletModalOpen ? toggleWalletModal : undefined)





  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)
  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector && connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [setWalletView, active, error, connector, walletModalOpen, activePrevious, connectorPrevious])

  const tryActivation = async (connector: AbstractConnector | undefined) => {
    let name = ''
    Object.keys(SUPPORTED_WALLETS).map((key) => {
      if (connector === SUPPORTED_WALLETS[key].connector) {
        return (name = SUPPORTED_WALLETS[key].name)
      }
      return true
    })
    // log selected wallet
    ReactGA.event({
      category: 'Wallet',
      action: 'Change Wallet',
      label: name,
    })

    setPendingWallet(connector) // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING)

    // if the connector is walletconnect and the user has already tried to connect, manually reset the connector

    console.dir(connector)
    if (connector instanceof WalletConnectConnector && connector.walletConnectProvider?.wc?.uri) {
      connector.walletConnectProvider = undefined
    }

    connector &&
      activate(connector, undefined, true).catch((error) => {
        if (error instanceof UnsupportedChainIdError) {
          activate(connector) // a little janky...can't use setError because the connector isn't set
        } else {
          setPendingError(true)
        }
      })
  }

  // close wallet modal if fortmatic modal is active
  useEffect(() => {
    fortmatic.on(OVERLAY_READY, () => {
      toggleWalletModal()
    })
  }, [toggleWalletModal])

  // get wallets user can switch too, depending on device/browser
  function getOptions() {
    const isMetamask = window.ethereum && window.ethereum.isMetaMask
    return Object.keys(SUPPORTED_WALLETS).map((key) => {
      const option = SUPPORTED_WALLETS[key]
      // check for mobile options
      if (isMobile) {
        //disable portis on mobile for now
        if (option.connector === portis) {
          return null
        }

        if (!window.web3 && !window.ethereum && option.mobile) {
          return (
            <Option
              onClick={() => {
                option.connector !== connector && !option.href && tryActivation(option.connector)
              }}
              id={`connect-${key}`}
              key={key}
              active={option.connector && option.connector === connector}
              color={option.color}
              link={option.href}
              header={option.name}
              subheader={null}
              icon={option.iconURL}
            />
          )
        }
        return null
      }

      // overwrite injected when needed
      if (option.connector === injected) {
        // don't show injected if there's no injected provider
        if (!(window.web3 || window.ethereum)) {
          if (option.name === 'MetaMask') {
            return (
              <Option
                id={`connect-${key}`}
                key={key}
                color={'#E8831D'}
                header={<Trans>Install Metamask</Trans>}
                subheader={null}
                link={'https://metamask.io/'}
                icon={MetamaskIcon}
              />
            )
          } else {
            return null //dont want to return install twice
          }
        }
        // don't return metamask if injected provider isn't metamask
        else if (option.name === 'MetaMask' && !isMetamask) {
          return null
        }
        // likewise for generic
        else if (option.name === 'Injected' && isMetamask) {
          return null
        }
      }

      // return rest of options
      return (
        !isMobile &&
        !option.mobileOnly && (
          <Option
            id={`connect-${key}`}
            onClick={() => {
              option.connector === connector
                ? setWalletView(WALLET_VIEWS.ACCOUNT)
                : !option.href && tryActivation(option.connector)
            }}
            key={key}
            active={option.connector === connector}
            color={option.color}
            link={option.href}
            header={option.name}
            subheader={null} //use option.descriptio to bring back multi-line
            icon={option.iconURL}
          />
        )
      )
    })
  }

  function getModalContent() {
    if (error) {
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <CloseColor />
          </CloseIcon>
          <HeaderRow>
            {error instanceof UnsupportedChainIdError ? <Trans>Wrong Network</Trans> : <Trans>Error connecting</Trans>}
          </HeaderRow>
          <ContentWrapper>
            {error instanceof UnsupportedChainIdError ? (
              <h5>
                <Trans>Please connect to the appropriate Ethereum network.</Trans>
              </h5>
            ) : (
              <Trans>Error connecting. Try refreshing the page.</Trans>
            )}
          </ContentWrapper>
        </UpperSection>
      )
    }
    if (account && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
        />
      )
    }
    return (
      
      
        

        <ContentWrapper>
          
          
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              connector={pendingWallet}
              error={pendingError}
              setPendingError={setPendingError}
              tryActivation={tryActivation}
            />
          ) : (
            <OptionGrid>{getOptions()}</OptionGrid>
          )}
        </ContentWrapper>

    )
  }




return (
  
  <Box position="relative" ref={ref} >

    {walletModalOpen && (
  <WalletDropdown top={{ sm: '56', lg: '28' }} bottom={{ sm: 'unset', lg: 'unset' }} right="0">   
  <ContentWrapper>{getModalContent()}</ContentWrapper>
  </WalletDropdown>
    )}
  </Box>
)
}

