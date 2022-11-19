import React, {useMemo} from 'react';

import {ButtonEmpty, ButtonMetamask} from 'components/Button'
import MetaMaskLogo from '../../assets/images/metamask.png'
import MetaMaskOnboarding from '@metamask/onboarding';
import {useIsMobile} from 'pages/Swap/SelectiveCharting'


const CONNECT_TEXT = 'Connect';
const CONNECTED_TEXT = 'Connected';

export function OnboardingButton() {
  const isMobile = useIsMobile()
  const ONBOARD_TEXT = useMemo(() => 
    isMobile ? 'Add Metamask' : 'Add Metamask'
  , [isMobile])
  const [buttonText, setButtonText] = React.useState(ONBOARD_TEXT)
  const [isDisabled, setDisabled] = React.useState(false)
  const [accounts, setAccounts] = React.useState<string[]>([])
  const onboarding = React.useRef<MetaMaskOnboarding>()


  React.useEffect(() => {
    if (!onboarding.current) {
      onboarding.current = new MetaMaskOnboarding();
    }
  }, []);

  React.useEffect(() => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      if (accounts.length > 0) {
        setButtonText(CONNECTED_TEXT);
        setDisabled(true);
        onboarding?.current?.stopOnboarding();
      } else {
        setButtonText(CONNECT_TEXT);
        setDisabled(false);
      }
    }
  }, [accounts]);

  React.useEffect(() => {
    function handleNewAccounts(newAccounts: string[]) {
      setAccounts(newAccounts);
    }
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
      (window?.ethereum as any)?.request({ method: 'eth_requestAccounts' })
        .then(handleNewAccounts);
      (window?.ethereum as any)?.on('accountsChanged', handleNewAccounts);
      return () => {
        (window?.ethereum as any)?.removeListener('accountsChanged', handleNewAccounts);
      };
    }

    return;
  }, []);

  const onClick = () => {
    if (MetaMaskOnboarding.isMetaMaskInstalled()) {
        (window?.ethereum as any)?.request({ method: 'eth_requestAccounts' })
        .then((newAccounts: string[]) => setAccounts(newAccounts));
    } else {
      onboarding.current?.startOnboarding();
    }
  };
  return (
    <ButtonMetamask style={{padding:10}} disabled={isDisabled} onClick={onClick}>
        {buttonText} &nbsp; <img src={MetaMaskLogo} style={{maxWidth:20}} />
    </ButtonMetamask>
  );
}