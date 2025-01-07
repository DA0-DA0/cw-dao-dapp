import JSON5 from 'json5'
import { TFunction } from 'react-i18next'

import {
  DurationUnits,
  GaiaMetaprotocolsExtensionData,
  ProposalExecutionMetadata,
  ProposalModuleInfo,
  ProposalVetoConfig,
} from '@dao-dao/types'
import {
  ProposalStatus,
  ProposalStatusKey,
} from '@dao-dao/types/contracts/common'
import {
  ProposalStatus as PreProposeStatus,
  ProposalStatusKey as PreProposeStatusKey,
} from '@dao-dao/types/contracts/DaoPreProposeApprovalSingle'
import { VetoConfig } from '@dao-dao/types/contracts/DaoProposalSingle.v2'

import { PROPOSAL_DESCRIPTION_METADATA_SEPARATOR } from './constants'
import {
  convertDurationToDurationWithUnits,
  convertDurationWithUnitsToDuration,
} from './conversion'

/**
 * Extract info from proposal ID.
 */
export const extractProposalInfo = (
  proposalId: string
): {
  prefix: string
  proposalNumber: number
  isPreProposeApprovalProposal: boolean
} => {
  // Prefix is alphabetical, followed by numeric prop number. If there is an
  // asterisk between the prefix and the prop number, this is a pre-propose
  // proposal. Allow the prefix to be empty for backwards compatibility. Default
  // to first proposal module if no alphabetical prefix.
  const proposalIdParts = proposalId.match(/^([A-Z]*)(\*)?(\d+)$/)
  if (proposalIdParts?.length !== 4) {
    throw new Error('Failed to parse proposal ID.')
  }

  // Undefined if matching group doesn't exist, i.e. no prefix exists.
  const prefix = proposalIdParts[1] ?? ''
  const isPreProposeApprovalProposal = proposalIdParts[2] === '*'
  const proposalNumber = Number(proposalIdParts[3])

  if (isNaN(proposalNumber)) {
    throw new Error(`Invalid proposal number "${proposalNumber}".`)
  }

  return {
    prefix,
    proposalNumber,
    isPreProposeApprovalProposal,
  }
}

/**
 * Get the status key from the weirdly-formatted status enum.
 */
export const keyFromPreProposeStatus = (
  status: PreProposeStatus
): PreProposeStatusKey => Object.keys(status)[0] as PreProposeStatusKey

/**
 * Returns the flattened key of the proposal status.
 *
 * @param {ProposalStatus} status - The proposal status.
 * @return {ProposalStatusKey} The flattened key of the proposal status.
 */
export const getProposalStatusKey = (
  status: ProposalStatus
): ProposalStatusKey =>
  typeof status === 'string'
    ? status
    : typeof status === 'object' && status
      ? (Object.keys(status)[0] as any)
      : (() => {
          throw new Error('Invalid proposal status.')
        })()

/**
 * Convert veto config into the veto object expected by proposal modules.
 */
export const convertVetoConfigToCosmos = (
  veto: ProposalVetoConfig
): VetoConfig | null =>
  veto.enabled
    ? {
        vetoer:
          // If more than one address set, there should be a cw1-whitelist
          // contract created. Otherwise, use the first address.
          veto.addresses.length > 1
            ? veto.cw1WhitelistAddress || ''
            : veto.addresses.length === 1
              ? veto.addresses[0].address
              : '',
        timelock_duration: convertDurationWithUnitsToDuration(
          veto.timelockDuration
        ),
        early_execute: veto.earlyExecute,
        veto_before_passed: veto.vetoBeforePassed,
      }
    : null

/**
 * Convert proposal module veto config into custom veto type. If config is
 * empty, returns default.
 */
export const convertCosmosVetoConfigToVeto = (
  veto: VetoConfig | null | undefined,
  /**
   * If provided, `veto.vetoer` should be a cw1-whitelist contract address, and
   * this should be its list of admins.
   */
  cw1WhitelistAdmins?: string[] | null
): ProposalVetoConfig =>
  veto
    ? {
        enabled: true,
        addresses: cw1WhitelistAdmins?.map((address) => ({
          address,
        })) || [
          {
            address: veto.vetoer,
          },
        ],
        cw1WhitelistAddress: cw1WhitelistAdmins ? veto.vetoer : undefined,
        timelockDuration: convertDurationToDurationWithUnits(
          veto.timelock_duration
        ),
        earlyExecute: veto.early_execute,
        vetoBeforePassed: veto.veto_before_passed,
      }
    : {
        enabled: false,
        addresses: [
          {
            address: '',
          },
        ],
        cw1WhitelistAddress: undefined,
        timelockDuration: {
          value: 1,
          units: DurationUnits.Weeks,
        },
        earlyExecute: true,
        vetoBeforePassed: false,
      }

/**
 * Check whether or not the submission policy allows an address and return an
 * error text if not. If allowed to propose, return undefined.
 */
export const checkProposalSubmissionPolicy = ({
  proposalModule: { prePropose },
  address,
  isMember,
  t,
}: {
  /**
   * The proposal module.
   */
  proposalModule: ProposalModuleInfo
  /**
   * Current wallet address. Undefined if not connected.
   */
  address?: string
  /**
   * Whether or not the current wallet is a member of the DAO.
   */
  isMember?: boolean
  /**
   * I18n translation getter.
   */
  t: TFunction
}): string | undefined =>
  prePropose
    ? 'anyone' in prePropose.submissionPolicy
      ? // Cannot create proposal if on denylist.
        address &&
        prePropose.submissionPolicy.anyone.denylist?.includes(address)
        ? t('error.notAllowedToCreateProposal')
        : undefined
      : // Cannot create proposal if on denylist.
        address &&
          prePropose.submissionPolicy.specific.denylist?.includes(address)
        ? t('error.notAllowedToCreateProposal')
        : // Cannot create proposal if not a member.
          (!prePropose.submissionPolicy.specific.dao_members || !isMember) &&
            (!address ||
              !prePropose.submissionPolicy.specific.allowlist?.includes(
                address
              ))
          ? // If members can propose and current wallet is not a member, prioritize that as the reason...
            prePropose.submissionPolicy.specific.dao_members && !isMember
            ? t('error.mustBeMemberToCreateProposal')
            : // ...otherwise their membership doesn't matter and they aren't on the allowlist.
              t('error.notAllowedToCreateProposal')
          : undefined
    : // If no pre-propose module in use, only DAO members can propose.
      isMember
      ? undefined
      : t('error.mustBeMemberToCreateProposal')

/**
 * Add additional metadata to the end of a proposal description as necessary.
 */
export const descriptionWithPotentialProposalMetadata = (
  description: string,
  {
    enabled,
    memo,
    gaiaMetaprotocolsExtensionData,
  }: ProposalExecutionMetadata = {}
): string => {
  if (!enabled) {
    return description
  }

  const metadata: ProposalExecutionMetadata = {
    version: 1,
  }

  if (memo?.trim()) {
    metadata.memo = memo
  }

  const validExtensionData = gaiaMetaprotocolsExtensionData?.flatMap(
    (data): GaiaMetaprotocolsExtensionData | [] =>
      data.protocolId && data.protocolVersion && data.data
        ? {
            ...data,
            // Ensure valid JSON.
            data: JSON.stringify(JSON5.parse(data.data)),
          }
        : []
  )
  if (validExtensionData?.length !== gaiaMetaprotocolsExtensionData?.length) {
    throw new Error('Invalid Gaia Metaprotocols extension data.')
  }
  if (validExtensionData?.length) {
    metadata.gaiaMetaprotocolsExtensionData = validExtensionData
  }

  // If metadata is not empty (beyond version), add it to the end of the
  // description.
  return Object.keys(metadata).length > 1
    ? `${description}${PROPOSAL_DESCRIPTION_METADATA_SEPARATOR}${JSON.stringify(
        metadata
      )}`
    : description
}

/**
 * Extract additional metadata from the end of a proposal description, and
 * return the description and metadata separately if it exists.
 */
export const extractProposalDescriptionAndMetadata = (
  description: string
): {
  description: string
  metadata?: ProposalExecutionMetadata
} => {
  if (!description.includes(PROPOSAL_DESCRIPTION_METADATA_SEPARATOR)) {
    return { description }
  }

  const metadataSeparatorStart = description.lastIndexOf(
    PROPOSAL_DESCRIPTION_METADATA_SEPARATOR
  )

  const metadataString = description.slice(
    metadataSeparatorStart + PROPOSAL_DESCRIPTION_METADATA_SEPARATOR.length
  )

  let metadata: ProposalExecutionMetadata
  try {
    metadata = JSON.parse(metadataString)
    if (typeof metadata !== 'object' || metadata === null) {
      throw new Error('Metadata is not an object.')
    }
  } catch {
    // Ignore metadata if failed to parse as JSON.
    return { description }
  }

  // Metadata version is not recognized.
  if (metadata.version !== 1) {
    return { description }
  }

  return {
    description: description.slice(0, metadataSeparatorStart),
    metadata,
  }
}
