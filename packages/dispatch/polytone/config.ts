import { ChainId } from '@dao-dao/types'

interface ChainConfig {
  /**
   * Polytone Listener code ID.
   */
  listenerCodeId?: number
  /**
   * Polytone Note code ID.
   */
  noteCodeId?: number
  /**
   * Polytone Proxy code ID.
   */
  proxyCodeId?: number
  /**
   * Polytone Voice code ID.
   */
  voiceCodeId?: number
  /**
   * Address length used for contracts.
   */
  addrLen?: number
}

/**
 * Map chain ID to deployment config.
 */
export const chains: Record<string, ChainConfig> = {
  [ChainId.CosmosHubMainnet]: {
    listenerCodeId: 17,
    noteCodeId: 18,
    proxyCodeId: 19,
    voiceCodeId: 20,
  },
  [ChainId.JunoMainnet]: {
    listenerCodeId: 3319,
    noteCodeId: 3320,
    proxyCodeId: 3321,
    voiceCodeId: 3322,
  },
  [ChainId.OsmosisMainnet]: {
    listenerCodeId: 125,
    noteCodeId: 126,
    proxyCodeId: 127,
    voiceCodeId: 128,
  },
  [ChainId.StargazeMainnet]: {
    listenerCodeId: 94,
    noteCodeId: 95,
    proxyCodeId: 96,
    voiceCodeId: 97,
  },
  [ChainId.MigalooMainnet]: {
    listenerCodeId: 255,
    noteCodeId: 256,
    proxyCodeId: 257,
    voiceCodeId: 258,
  },
  [ChainId.NeutronMainnet]: {
    listenerCodeId: 229,
    noteCodeId: 230,
    proxyCodeId: 231,
    voiceCodeId: 578,
  },
  [ChainId.OraichainMainnet]: {
    listenerCodeId: 1567,
    noteCodeId: 1568,
    proxyCodeId: 1569,
    voiceCodeId: 1570,
  },
  [ChainId.ChihuahuaMainnet]: {
    listenerCodeId: 539,
    noteCodeId: 540,
    proxyCodeId: 541,
    voiceCodeId: 542,
  },
  [ChainId.TerraMainnet]: {
    listenerCodeId: 2370,
    noteCodeId: 2371,
    proxyCodeId: 2372,
    voiceCodeId: 2373,
  },
  [ChainId.TerraClassicMainnet]: {
    listenerCodeId: 8751,
    noteCodeId: 8752,
  },
  [ChainId.OmniflixHubMainnet]: {
    listenerCodeId: 1,
    noteCodeId: 2,
    proxyCodeId: 3,
    voiceCodeId: 4,
  },
  [ChainId.KujiraMainnet]: {
    listenerCodeId: 276,
    noteCodeId: 277,
    proxyCodeId: 279,
    voiceCodeId: 278,
  },
  [ChainId.ArchwayMainnet]: {
    listenerCodeId: 392,
    noteCodeId: 394,
    proxyCodeId: 395,
    voiceCodeId: 396,
  },
  [ChainId.InjectiveMainnet]: {
    listenerCodeId: 969,
    noteCodeId: 970,
    proxyCodeId: 971,
    voiceCodeId: 972,
    addrLen: 20,
  },
  [ChainId.BitsongMainnet]: {
    listenerCodeId: 24,
    noteCodeId: 25,
    proxyCodeId: 26,
    voiceCodeId: 27,
  },
}
