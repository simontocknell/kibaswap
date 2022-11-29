import { style } from '@vanilla-extract/css'

import { sprinkles, themeVars, vars } from 'theme/spinkles.css'

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

export const mobileNavDropdownTop = style([
  baseNavDropdown,
  sprinkles({
    position: 'fixed',
    left: '0',
    right: '0',
    width: 'full',
  }),
  {
    borderRightWidth: '0px',
    borderLeftWidth: '0px',
  },
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


export const subhead = sprinkles({ fontWeight: 'medium', fontSize: '16', lineHeight: '24' })


export const hover = style([
  sprinkles({
    transition: '250',
    borderRadius: '12',
  }),
  {
    ':hover': {
      background: vars.color.lightGrayOverlay,
      color: 'textPrimary',
    },
  },
])

export const MenuRow = style([
  hover,
  sprinkles({
    color: 'textPrimary',
    paddingY: '8',
    paddingX: '8',
    width: 'full',
    whiteSpace: 'nowrap',
  }),
  {
    lineHeight: '24px',
    textDecoration: 'none',
  },
])

export const PrimaryText = style([
  {
    lineHeight: '24px',

  },
])

export const SecondaryText = style([
  hover,
  sprinkles({
    paddingY: '8',
    paddingX: '8',
    color: 'textSecondary',
    width: 'full',
  }),
  {
    lineHeight: '20px',
  },
])

export const Separator = style([
  sprinkles({
    height: '0',
    marginX: '16',
  }),
  {
    borderTop: 'solid',
    borderColor: themeVars.colors.backgroundOutline,
    borderWidth: '1px',
  },
])

export const IconRow = style([
  sprinkles({
    paddingX: '16',
    justifyContent: { sm: 'center', md: 'flex-start' },
  }),
])

const baseMenuItem = style([
  subhead,
  sprinkles({
    paddingY: '16',
    paddingX: '16',
    marginY: '4',
    borderRadius: '12',
    transition: '250',
    height: 'min',
    width: 'full',
    textAlign: 'center',
  }),
  {
    lineHeight: '24px',
    textDecoration: 'none',
    ':hover': {
      background: 'none',
    },
  },
])

export const menuItem = style([
  baseMenuItem,
  sprinkles({
    color: 'textSecondary',
  }),
])

export const activeMenuItem = style([
  baseMenuItem,
  sprinkles({
    color: 'textPrimary',
    background: 'backgroundFloating',
  }),
])

