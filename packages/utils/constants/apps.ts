import { App as App } from '@dao-dao/types'

import { MAINNET } from './env'

export const APPS: App[] = [
  {
    name: 'DAO DAO',
    imageUrl: '/apps/daodao.png',
    url: 'https://daodao.zone',
  },
  {
    name: 'Osmosis',
    imageUrl: 'https://app.osmosis.zone/images/preview.jpg',
    url: 'https://app.osmosis.zone',
  },
  {
    name: 'Astroport',
    imageUrl: 'https://app.astroport.fi/thumbnail.jpg',
    url: 'https://app.astroport.fi/swap',
  },
  {
    name: 'Stargaze',
    imageUrl: 'https://stargaze.zone/TwitterCard.png',
    url: MAINNET
      ? 'https://stargaze.zone'
      : 'https://testnet.publicawesome.dev',
  },
  {
    name: 'Stargaze Studio',
    imageUrl: 'https://studio.stargaze.zone/assets/android-chrome-256x256.png',
    url: MAINNET
      ? 'https://studio.stargaze.zone'
      : 'https://studio.publicawesome.dev',
  },
  {
    name: 'Stardex',
    imageUrl: '/apps/stardex.jpg',
    url: 'https://swap.stargaze.zone/swap',
  },
  {
    name: 'Mars Protocol',
    imageUrl: '/apps/mars.jpg',
    url: 'https://app.marsprotocol.io',
  },
  {
    name: 'Calculated Finance',
    imageUrl: '/apps/calcfi.jpg',
    url: 'https://app.calculated.fi/?chain=osmosis-1',
  },
  {
    name: 'FIN',
    platform: 'Kujira',
    imageUrl: '/apps/fin.png',
    url: 'https://fin.kujira.network',
  },
  {
    name: 'BOW',
    platform: 'Kujira',
    imageUrl: '/apps/bow.png',
    url: 'https://bow.kujira.network',
  },
  {
    name: 'GHOST',
    platform: 'Kujira',
    imageUrl: '/apps/ghost.png',
    url: 'https://ghost.kujira.network',
  },
  {
    name: 'PILOT',
    platform: 'Kujira',
    imageUrl: '/apps/pilot.png',
    url: 'https://pilot.kujira.network',
  },
  {
    name: 'Kleomedes',
    imageUrl: '/apps/kleomedes.png',
    url: 'https://dashboard.kleomed.es',
  },
  {
    name: 'Atlas',
    imageUrl: '/apps/atlas.jpg',
    url: MAINNET
      ? 'https://app.atlasdao.zone'
      : 'https://testapp.atlasdao.zone',
  },

  // Must be last for index matching. Enables custom URL input.
  {
    name: '',
    imageUrl: '',
    url: '',
  },
]
