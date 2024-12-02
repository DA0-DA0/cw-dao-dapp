import semverGte from 'semver/functions/gte'

import { ContractVersion, Feature } from '@dao-dao/types'

/**
 * Checks if a specific feature is supported by a given contract version.
 *
 * @param {Feature} feature - The feature to check.
 * @param {ContractVersion} version - The contract version to check against.
 * @return {boolean} Returns true if the feature is supported by the version,
 * false otherwise.
 */
export const isFeatureSupportedByVersion = (
  feature: Feature,
  version: ContractVersion
): boolean => {
  switch (feature) {
    case Feature.StorageItemValueKey:
      return versionGte(version, ContractVersion.V2Beta)
    case Feature.MultipleChoiceProposals:
    case Feature.SubDaos:
    case Feature.PrePropose:
    case Feature.StaticProposalModulePrefixes:
    case Feature.VoteUntilExpiration:
      return versionGte(version, ContractVersion.V2Alpha)
    case Feature.DaoVotingCw721StakedNoOwner:
    case Feature.ModuleInstantiateFunds:
      return versionGte(version, ContractVersion.V230)
    case Feature.VotingModuleTokenTypeFix:
    case Feature.Approval:
    case Feature.Veto:
      return versionGte(version, ContractVersion.V240)
    case Feature.CastVoteOnProposalCreation:
      return versionGte(version, ContractVersion.V241)
    case Feature.GranularSubmissionPolicy:
      return versionGte(version, ContractVersion.V250)
    case Feature.UnlimitedNftClaims:
      return versionGte(version, ContractVersion.V260)
    default:
      return true
  }
}

/**
 * Checks if a given version is greater than or equal to a specified version.
 *
 * @param {ContractVersion} version - The version to check.
 * @param {ContractVersion} gteThis - The version to compare with.
 * @return {boolean} Returns true if the given version is greater than or equal
 * to the specified version.
 */
export const versionGte = (
  version: ContractVersion,
  gteThis: ContractVersion
): boolean => {
  try {
    return semverGte(version, gteThis)
  } catch {
    // If throws an error, one of the versions was invalid (likely not a
    // version, like ContractVersion.Gov), so just return false.
    return false
  }
}

/**
 * Checks whether or not the given version is a Neutron fork version.
 */
export const isNeutronForkVersion = (version: ContractVersion): boolean =>
  version === ContractVersion.V2AlphaNeutronFork1 ||
  version === ContractVersion.V2AlphaNeutronFork2 ||
  version === ContractVersion.V2AlphaNeutronFork3
