import { style } from '@vanilla-extract/css'

import { sprinkles } from 'theme/spinkles.css'

const baseNavDropdown = style([
  sprinkles({
    background: 'backgroundSurface',
    paddingBottom: '8',
    paddingTop: '8',
    zIndex: '2',
  }),
  {
    boxShadow: '0px 4px 12px 0px #00000026',
  },
])

export const NavDropdown = style([
  baseNavDropdown,
  sprinkles({
    position: 'absolute',
    borderRadius: '12',
  }),
  {},
])

export const mobileNavDropdown = style([
  baseNavDropdown,
  sprinkles({
    position: 'fixed',
    borderTopRightRadius: '12',
    borderTopLeftRadius: '12',
    top: 'unset',
    bottom: '56',
    left: '0',
    right: '0',
    width: 'full',
  }),
  {
    borderRightWidth: '0px',
    borderLeftWidth: '0px',
  },
])