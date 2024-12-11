import { ChainId } from '@dao-dao/types'

/**
 * Map chain ID to indexer ansible group_vars name.
 */
export const chainIdToIndexerGroupVarsName: Record<string, string> = {
  [ChainId.BitsongMainnet]: 'bitsong_mainnet',
  [ChainId.BitsongTestnet]: 'bitsong_testnet',
  [ChainId.CosmosHubMainnet]: 'cosmosHub_mainnet',
  [ChainId.CosmosHubProviderTestnet]: 'cosmosHubProvider_testnet',
  [ChainId.JunoMainnet]: 'juno_mainnet',
  [ChainId.JunoTestnet]: 'juno_testnet',
  [ChainId.KujiraMainnet]: 'kujira_mainnet',
  [ChainId.KujiraTestnet]: 'kujira_testnet',
  [ChainId.MigalooMainnet]: 'migaloo_mainnet',
  [ChainId.MigalooTestnet]: 'migaloo_testnet',
  [ChainId.NeutronMainnet]: 'neutron_mainnet',
  [ChainId.NeutronTestnet]: 'neutron_testnet',
  [ChainId.OmniflixHubMainnet]: 'omniflix_mainnet',
  [ChainId.OmniflixHubTestnet]: 'omniflix_testnet',
  [ChainId.OraichainMainnet]: 'oraichain_mainnet',
  [ChainId.OsmosisMainnet]: 'osmosis_mainnet',
  [ChainId.OsmosisTestnet]: 'osmosis_testnet',
  [ChainId.StargazeMainnet]: 'stargaze_mainnet',
  [ChainId.StargazeTestnet]: 'stargaze_testnet',
  [ChainId.TerraMainnet]: 'terra_mainnet',
  [ChainId.TerraClassicMainnet]: 'terraClassic_mainnet',
}

/**
 * Map chain ID to deployment argument overrides.
 */
export const chainIdToDeploymentArgs: Record<string, Record<string, any>> = {
  [ChainId.StargazeMainnet]: {
    authz: 'stars1565xc6aq0ycfx5zwusevpmwx6f5uzp93zuutfp',
  },
  [ChainId.KujiraMainnet]: {
    mnemonic: 'df_operator',
    authz: 'kujira1ss7avjjlzrmnp2m3thges80vetpq4nr8tjk20f0arweke8r840ss58v6yh',
    restrictInstantiation: true,
    instantiateAdminFactory: false,
  },
  [ChainId.OmniflixHubMainnet]: {
    mnemonic: 'df_operator',
    authz:
      'omniflix1kr6t4gg33kfuc26rz4xxkv0ftlxq5j09pndcf9ndk450rrevgf8sy59urv',
  },
  [ChainId.BitsongTestnet]: {
    mnemonic: 'bitsong_testnet',
  },
}
