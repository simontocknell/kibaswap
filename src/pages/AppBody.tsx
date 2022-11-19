import React from 'react'
import styled from 'styled-components/macro'

 

export const BodyWrapper = styled.div<{ margin?: string; maxWidth?: string }>`



  position: relative;
  margin-top: ${({ margin }) => margin ?? '0px'};
  max-width: ${({ maxWidth }) => maxWidth ?? '480px'};
  width: 100%;
  background: ${({ theme }) => theme.bg0};
  box-shadow: ${({ theme }) => theme.shadowD};

  border-radius: 24px;
  margin-top: 1rem;
  .eRvDHB, .jwZvNA {
    color:#fff !important;
  }
`



/**
 * The styled container element that wraps the content of most pages and the tabs.
 */
export default function AppBody({ children, style, ...rest }: { children: React.ReactNode, style?: any }) {
  return <BodyWrapper style={style} {...rest}>{children}</BodyWrapper>
}
