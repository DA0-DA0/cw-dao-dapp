import { Asset } from '@chain-registry/types'
import { fromBase64 } from '@cosmjs/encoding'
import { Coin } from '@cosmjs/stargate'
import { QueryClient, queryOptions, skipToken } from '@tanstack/react-query'
import uniq from 'lodash.uniq'

import { HugeDecimal } from '@dao-dao/math'
import {
  AllGovParams,
  ChainId,
  Delegation,
  GovProposalVersion,
  GovProposalWithDecodedContent,
  NativeDelegationInfo,
  ProposalV1,
  ProposalV1Beta1,
  UnbondingDelegation,
  Validator,
} from '@dao-dao/types'
import { ModuleAccount } from '@dao-dao/types/protobuf/codegen/cosmos/auth/v1beta1/auth'
import { Metadata } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/bank'
import { DecCoin } from '@dao-dao/types/protobuf/codegen/cosmos/base/v1beta1/coin'
import {
  ProposalStatus,
  TallyResult,
  Vote,
  WeightedVoteOption,
} from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import {
  cosmosProtoRpcClientRouter,
  cosmosSdkVersionIs46OrHigher,
  cosmosSdkVersionIs47OrHigher,
  cosmosValidatorToValidator,
  decodeGovProposal,
  feemarketProtoRpcClientRouter,
  getAllRpcResponse,
  getChainForChainId,
  getCosmWasmClientForChainId,
  getNativeTokenForChainId,
  ibcProtoRpcClientRouter,
  isNonexistentQueryError,
  isValidBech32Address,
  osmosisProtoRpcClientRouter,
  stargateClientRouter,
} from '@dao-dao/utils'

import {
  SearchGovProposalsOptions,
  searchGovProposals,
} from '../../indexer/search'
import { indexerQueries } from './indexer'

/**
 * Fetch the module address associated with the specified name.
 */
const fetchChainModuleAddress = async ({
  chainId,
  name,
}: {
  chainId: string
  name: string
}): Promise<string> => {
  const client = await cosmosProtoRpcClientRouter.connect(chainId)

  let account: ModuleAccount | undefined
  try {
    const response = await client.auth.v1beta1.moduleAccountByName({
      name,
    })
    account = response?.account
  } catch (err) {
    // Some chains don't support getting a module account by name directly, so
    // fallback to getting all module accounts.
    if (err instanceof Error && err.message.includes('unknown query path')) {
      const { accounts } = await client.auth.v1beta1.moduleAccounts({})
      account = accounts.find(
        (acc) =>
          'name' in acc && (acc as unknown as ModuleAccount).name === name
      ) as unknown as ModuleAccount | undefined
    } else {
      // Rethrow other errors.
      throw err
    }
  }

  if (!account) {
    throw new Error(`Failed to find ${name} module address.`)
  }

  return 'baseAccount' in account ? account.baseAccount?.address ?? '' : ''
}

/**
 * Fetch the module name associated with the specified address. Returns null if
 * not a module account.
 */
const fetchChainModuleName = async ({
  chainId,
  address,
}: {
  chainId: string
  address: string
}): Promise<string | null> => {
  const client = await cosmosProtoRpcClientRouter.connect(chainId)

  try {
    const { account } = await client.auth.v1beta1.account({
      address,
    })

    if (!account) {
      return null
    }

    // If not decoded automatically...
    if (account.typeUrl === ModuleAccount.typeUrl) {
      return ModuleAccount.decode(account.value).name

      // If decoded automatically...
    } else if (account.$typeUrl === ModuleAccount.typeUrl) {
      return (account as unknown as ModuleAccount).name
    }
  } catch (err) {
    // If no account found, return null.
    if (
      err instanceof Error &&
      err.message.includes('not found: key not found')
    ) {
      return null
    }

    // Rethrow other errors.
    throw err
  }

  return null
}

/**
 * Check whether or not the address is a chain module, optionally with a
 * specific name.
 */
export const isAddressModule = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
    moduleName,
  }: {
    chainId: string
    address: string
    /**
     * If defined, check that the module address matches the specified name.
     */
    moduleName?: string
  }
): Promise<boolean> => {
  if (!isValidBech32Address(address)) {
    return false
  }

  try {
    const name = await queryClient.fetchQuery(
      chainQueries.moduleName({
        chainId,
        address,
      })
    )

    // Null if not a module.
    if (!name) {
      return false
    }

    // If name to check provided, check it. Otherwise, return true.
    return !moduleName || name === moduleName
  } catch (err) {
    // If invalid address, return false. Should never happen because of the
    // check at the beginning, but just in case.
    if (
      err instanceof Error &&
      err.message.includes('decoding bech32 failed')
    ) {
      return false
    }

    // Rethrow other errors.
    throw err
  }
}

/**
 * Fetch the timestamp for a given block height.
 */
export const fetchBlockTimestamp = async ({
  chainId,
  height,
}: {
  chainId: string
  height: number
}): Promise<number> => {
  const client = await getCosmWasmClientForChainId(chainId)
  return new Date((await client.getBlock(height)).header.time).getTime()
}

/**
 * Fetch the native token balance for a given address.
 */
export const fetchBalance = async ({
  chainId,
  address,
  denom,
}: {
  chainId: string
  address: string
  denom: string
}): Promise<Coin> => {
  const client = await stargateClientRouter.connect(chainId)
  return await client.getBalance(address, denom)
}

/**
 * Fetch the sum of native tokens staked across all validators.
 */
export const fetchNativeStakedBalance = async ({
  chainId,
  address,
}: {
  chainId: string
  address: string
}): Promise<Coin> => {
  // Neutron does not have staking.
  if (
    chainId === ChainId.NeutronMainnet ||
    chainId === ChainId.NeutronTestnet
  ) {
    return {
      amount: '0',
      denom: getNativeTokenForChainId(chainId).denomOrAddress,
    }
  }

  const client = await stargateClientRouter.connect(chainId)
  const balance = await client.getBalanceStaked(address)

  return (
    balance ?? {
      amount: '0',
      denom: getNativeTokenForChainId(chainId).denomOrAddress,
    }
  )
}

/**
 * Fetch the total native tokens staked across the whole chain.
 */
export const fetchTotalNativeStakedBalance = async ({
  chainId,
}: {
  chainId: string
}): Promise<string> => {
  // Neutron does not have staking.
  if (
    chainId === ChainId.NeutronMainnet ||
    chainId === ChainId.NeutronTestnet
  ) {
    return '0'
  }

  const client = await cosmosProtoRpcClientRouter.connect(chainId)
  const { pool } = await client.staking.v1beta1.pool()

  if (!pool) {
    throw new Error('No staking pool found')
  }

  return pool.bondedTokens
}

/**
 * Fetch native delegation info.
 */
export const fetchNativeDelegationInfo = async (
  queryClient: QueryClient,
  {
    chainId,
    address,
  }: {
    chainId: string
    address: string
  }
): Promise<NativeDelegationInfo> => {
  // Neutron does not support staking.
  if (
    chainId === ChainId.NeutronMainnet ||
    chainId === ChainId.NeutronTestnet
  ) {
    return {
      delegations: [],
      unbondingDelegations: [],
    }
  }

  const client = await cosmosProtoRpcClientRouter.connect(chainId)

  try {
    const delegations = await getAllRpcResponse(
      client.staking.v1beta1.delegatorDelegations,
      {
        delegatorAddr: address,
        pagination: undefined,
      },
      'delegationResponses'
    )
    const rewards = (
      await client.distribution.v1beta1.delegationTotalRewards({
        delegatorAddress: address,
      })
    ).rewards
    const unbondingDelegations = await getAllRpcResponse(
      client.staking.v1beta1.delegatorUnbondingDelegations,
      {
        delegatorAddr: address,
        pagination: undefined,
      },
      'unbondingResponses'
    )

    const uniqueValidators = uniq([
      ...delegations.flatMap(
        ({ delegation }) => delegation?.validatorAddress || []
      ),
      ...unbondingDelegations.map(({ validatorAddress }) => validatorAddress),
    ])
    const validators = await Promise.all(
      uniqueValidators.map((address) =>
        queryClient.fetchQuery(
          chainQueries.validator({
            chainId,
            address,
          })
        )
      )
    )

    return {
      delegations: delegations.flatMap(
        ({
          delegation: { validatorAddress: address } = {
            validatorAddress: '',
          },
          balance: delegationBalance,
        }): Delegation | [] => {
          if (
            !delegationBalance ||
            delegationBalance.denom !==
              getNativeTokenForChainId(chainId).denomOrAddress
          ) {
            return []
          }

          const validator = validators.find((v) => v.address === address)
          let pendingReward = rewards
            .find(({ validatorAddress }) => validatorAddress === address)
            ?.reward.find(
              ({ denom }) =>
                denom === getNativeTokenForChainId(chainId).denomOrAddress
            )

          if (!validator || !pendingReward) {
            return []
          }

          // Truncate.
          pendingReward.amount = pendingReward.amount.split('.')[0]

          return {
            validator,
            delegated: delegationBalance,
            pendingReward,
          }
        }
      ),

      // Only returns native token unbondings, no need to check.
      unbondingDelegations: unbondingDelegations.flatMap(
        ({ validatorAddress, entries }) => {
          const validator = validators.find(
            (v) => v.address === validatorAddress
          )
          if (!validator) {
            return []
          }

          return entries.map(
            ({
              creationHeight,
              completionTime,
              balance,
            }): UnbondingDelegation => ({
              validator,
              balance: {
                amount: balance,
                denom: getNativeTokenForChainId(chainId).denomOrAddress,
              },
              startedAtHeight: Number(creationHeight),
              finishesAt: completionTime || new Date(0),
            })
          )
        }
      ),
    }
  } catch (err) {
    // Fails on chains without staking.
    if (isNonexistentQueryError(err)) {
      return {
        delegations: [],
        unbondingDelegations: [],
      }
    }

    // Rethrow error if anything else, like a network error.
    throw err
  }
}

/**
 * Fetch the unstaking duration in seconds for the native token.
 */
export const fetchNativeUnstakingDurationSeconds = async ({
  chainId,
}: {
  chainId: string
}): Promise<number> => {
  // Neutron does not have staking.
  if (
    chainId === ChainId.NeutronMainnet ||
    chainId === ChainId.NeutronTestnet
  ) {
    return 0
  }

  const client = await cosmosProtoRpcClientRouter.connect(chainId)
  try {
    const { params } = await client.staking.v1beta1.params()
    return Number(params?.unbondingTime?.seconds ?? -1)
  } catch (err) {
    // Staking unsupported.
    if (isNonexistentQueryError(err)) {
      return 0
    }

    // Rethrow other errors.
    throw err
  }
}

/**
 * Fetch a validator.
 */
export const fetchValidator = async ({
  chainId,
  address,
}: {
  chainId: string
  address: string
}): Promise<Validator> => {
  const client = await cosmosProtoRpcClientRouter.connect(chainId)

  const { validator } = await client.staking.v1beta1.validator({
    validatorAddr: address,
  })
  if (!validator) {
    throw new Error('Validator not found')
  }

  return cosmosValidatorToValidator(validator)
}

/**
 * Fetch the dynamic gas price for the native fee token.
 */
export const fetchDynamicGasPrice = async ({
  chainId,
}: {
  chainId: string
}): Promise<DecCoin> => {
  // Osmosis uses osmosis.txfees module.
  if (
    chainId === ChainId.OsmosisMainnet ||
    chainId === ChainId.OsmosisTestnet
  ) {
    const client = await osmosisProtoRpcClientRouter.connect(chainId)
    const { baseFee } = await client.txfees.v1beta1.getEipBaseFee()
    return {
      amount: baseFee,
      denom: getNativeTokenForChainId(chainId).denomOrAddress,
    }
  }

  // Neutron, Cosmos Hub, and probably others use Skip's feemarket module.
  const client = await feemarketProtoRpcClientRouter.connect(chainId)
  const { price } = await client.feemarket.v1.gasPrice({
    denom: getNativeTokenForChainId(chainId).denomOrAddress,
  })

  if (!price) {
    throw new Error('No dynamic gas price found')
  }

  return price
}

/**
 * Fetch the on-chain metadata for a denom if it exists. Returns null if denom
 * not found. This likely exists for token factory denoms.
 */
export const fetchDenomMetadata = async ({
  chainId,
  denom,
}: {
  chainId: string
  denom: string
}): Promise<{
  metadata: Metadata
  preferredSymbol: string
  preferredDecimals: number
} | null> => {
  const client = await cosmosProtoRpcClientRouter.connect(chainId)
  try {
    const { metadata } = await client.bank.v1beta1.denomMetadata({ denom })

    if (metadata) {
      const { base, denomUnits, symbol, display } = metadata

      // If display is equal to the base, use the symbol denom unit if
      // available. This fixes the case where display was not updated even
      // though a nonzero exponent was created.
      const searchDenom = display === base ? symbol : display

      const displayDenom =
        denomUnits.find(({ denom }) => denom === searchDenom) ??
        denomUnits.find(({ denom }) => denom === display) ??
        denomUnits.find(({ exponent }) => exponent > 0) ??
        denomUnits[0]

      const extractedSymbol = displayDenom
        ? displayDenom.denom.startsWith('factory/')
          ? displayDenom.denom.split('/').pop()!
          : displayDenom.denom
        : metadata.symbol

      return {
        metadata,
        // If factory denom, extract symbol at the end.
        preferredSymbol:
          // convert `utoken` to `TOKEN`
          (extractedSymbol.startsWith('u') &&
          extractedSymbol.toLowerCase() === extractedSymbol
            ? extractedSymbol.substring(1).toUpperCase()
            : extractedSymbol) || denom,
        preferredDecimals:
          displayDenom?.exponent ||
          (chainId === ChainId.KujiraMainnet ||
          chainId === ChainId.KujiraTestnet
            ? // Kujira does not let setting token metadata, so default to 6.
              6
            : 0),
      }
    }
  } catch (err) {
    // If denom not found, return null.
    if (err instanceof Error && err.message.includes('key not found')) {
      return null
    }

    // Rethrow other errors.
    throw err
  }

  return null
}

/**
 * Fetch the cosmos-sdk version of a chain.
 */
export const fetchChainCosmosSdkVersion = async ({
  chainId,
}: {
  chainId: string
}): Promise<string> => {
  const protoClient = await cosmosProtoRpcClientRouter.connect(chainId)

  const { applicationVersion } =
    await protoClient.base.tendermint.v1beta1.getNodeInfo()

  // Remove `v` prefix.
  return applicationVersion?.cosmosSdkVersion.slice(1) || '0.0.0'
}

/**
 * Fetch whether or not a chain supports the v1 gov module.
 */
export const fetchChainSupportsV1GovModule = async (
  queryClient: QueryClient,
  {
    chainId,
    require47 = false,
  }: {
    chainId: string
    /**
     * Whether or not v0.47 or higher is required. V1 gov is supported by
     * v0.46+, but some other things, like unified gov params, are supported
     * only on v0.47+.
     *
     * Defaults to false.
     */
    require47?: boolean
  }
): Promise<boolean> => {
  const cosmosSdkVersion = await queryClient.fetchQuery(
    chainQueries.cosmosSdkVersion({ chainId })
  )

  const checker = require47
    ? cosmosSdkVersionIs47OrHigher
    : cosmosSdkVersionIs46OrHigher
  if (!checker(cosmosSdkVersion)) {
    return false
  }

  const client = await cosmosProtoRpcClientRouter.connect(chainId)

  // Double-check by testing a v1 gov route.
  try {
    await client.gov.v1.params({
      paramsType: 'voting',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Fetch whether or not a chain supports the ICA controller module.
 */
export const fetchSupportsIcaController = async ({
  chainId,
}: {
  chainId: string
}): Promise<boolean> => {
  const client = await ibcProtoRpcClientRouter.connect(chainId)

  try {
    const { params: { controllerEnabled } = {} } =
      await client.applications.interchain_accounts.controller.v1.params()

    return !!controllerEnabled
  } catch (err) {
    if (isNonexistentQueryError(err)) {
      return false
    }

    // Rethrow other errors.
    throw err
  }
}

/**
 * Fetch governance module params.
 */
export const fetchGovParams = async (
  queryClient: QueryClient,
  {
    chainId,
  }: {
    chainId: string
  }
): Promise<AllGovParams> => {
  const [supportsV1, client] = await Promise.all([
    queryClient.fetchQuery(
      chainQueries.supportsV1GovModule(queryClient, {
        chainId,
        require47: true,
      })
    ),
    cosmosProtoRpcClientRouter.connect(chainId),
  ])

  if (supportsV1) {
    try {
      const { params } = await client.gov.v1.params({
        // Does not matter.
        paramsType: 'tallying',
      })
      if (!params) {
        throw new Error('Gov params failed to load')
      }

      return {
        ...params,
        quorum: Number(params.quorum),
        threshold: Number(params.threshold),
        vetoThreshold: Number(params.vetoThreshold),
        minInitialDepositRatio: Number(params.minInitialDepositRatio),
        supportsV1,
      }
    } catch (err) {
      // Fallback to v1beta1 query if v1 not supported.
      if (!isNonexistentQueryError(err)) {
        // Rethrow other errors.
        throw err
      }
    }
  }

  // v1beta1 queries are separate

  const [{ votingParams }, { depositParams }, { tallyParams }] =
    await Promise.all([
      client.gov.v1beta1.params({
        paramsType: 'voting',
      }),
      client.gov.v1beta1.params({
        paramsType: 'deposit',
      }),
      client.gov.v1beta1.params({
        paramsType: 'tallying',
      }),
    ])

  if (!votingParams || !depositParams || !tallyParams) {
    throw new Error('Gov params failed to load')
  }

  return {
    minDeposit: depositParams.minDeposit,
    maxDepositPeriod: depositParams.maxDepositPeriod,
    votingPeriod: votingParams.votingPeriod,
    quorum: Number(tallyParams.quorum),
    threshold: Number(tallyParams.threshold),
    vetoThreshold: Number(tallyParams.vetoThreshold),
    // Cannot retrieve this from v1beta1 query, so just assume 0.25 as it is a
    // conservative estimate. Osmosis uses 0.25 and Juno uses 0.2 as of
    // 2023-08-13
    minInitialDepositRatio: 0.25,
    supportsV1: false,
  }
}

/**
 * Search chain governance proposals and decode their content.
 */
export const searchAndDecodeGovProposals = async (
  queryClient: QueryClient,
  options: SearchGovProposalsOptions
): Promise<{
  proposals: GovProposalWithDecodedContent[]
  total: number
}> => {
  const [supportsV1Gov, { results, total }] = await Promise.all([
    queryClient.fetchQuery(
      chainQueries.supportsV1GovModule(queryClient, {
        chainId: options.chainId,
      })
    ),
    queryClient.fetchQuery(chainQueries.searchGovProposals(options)),
  ])

  const proposals = (
    await Promise.allSettled(
      results.map(async ({ value: { id, data } }) =>
        decodeGovProposal(
          options.chainId,
          supportsV1Gov
            ? {
                version: GovProposalVersion.V1,
                id: BigInt(id),
                proposal: ProposalV1.decode(fromBase64(data)),
              }
            : {
                version: GovProposalVersion.V1_BETA_1,
                id: BigInt(id),
                proposal: ProposalV1Beta1.decode(
                  fromBase64(data),
                  undefined,
                  true
                ),
              }
        )
      )
    )
  ).flatMap((p) => (p.status === 'fulfilled' ? p.value : []))

  return {
    proposals,
    total,
  }
}

/**
 * Fetch the governance proposals for a chain, defaulting to those that are
 * currently open for voting.
 */
export const fetchGovProposals = async (
  queryClient: QueryClient,
  {
    chainId,
    status,
    offset,
    limit,
  }: {
    chainId: string
    status?: ProposalStatus
    offset?: number
    limit?: number
  }
): Promise<{
  proposals: GovProposalWithDecodedContent[]
  total: number
}> => {
  const indexerProposals = await queryClient
    .fetchQuery(
      chainQueries.searchAndDecodeGovProposals(queryClient, {
        chainId,
        status,
        offset,
        limit,
      })
    )
    .catch(() => undefined)

  if (indexerProposals?.proposals.length) {
    return indexerProposals
  }

  // Fallback to querying chain if indexer failed.
  const [client, supportsV1Gov] = await Promise.all([
    cosmosProtoRpcClientRouter.connect(chainId),
    queryClient.fetchQuery(
      chainQueries.supportsV1GovModule(queryClient, {
        chainId,
      })
    ),
  ])

  let v1Proposals: ProposalV1[] | undefined
  let v1Beta1Proposals: ProposalV1Beta1[] | undefined
  let total = 0

  if (supportsV1Gov) {
    try {
      if (limit === undefined && offset === undefined) {
        v1Proposals =
          (await getAllRpcResponse(
            client.gov.v1.proposals,
            {
              proposalStatus:
                status || ProposalStatus.PROPOSAL_STATUS_UNSPECIFIED,
              voter: '',
              depositor: '',
              pagination: undefined,
            },
            'proposals',
            true
          )) || []
        total = v1Proposals.length
      } else {
        const response = await client.gov.v1.proposals({
          proposalStatus: status || ProposalStatus.PROPOSAL_STATUS_UNSPECIFIED,
          voter: '',
          depositor: '',
          pagination: {
            key: new Uint8Array(),
            offset: BigInt(offset || 0),
            limit: BigInt(limit || 0),
            countTotal: true,
            reverse: true,
          },
        })
        v1Proposals = response.proposals
        total = Number(response.pagination?.total || 0)
      }
    } catch (err) {
      // Fallback to v1beta1 query if v1 not supported.
      if (
        !(err instanceof Error) ||
        !err.message.includes('unknown query path')
      ) {
        // Rethrow other errors.
        throw err
      }
    }
  }

  if (!v1Proposals) {
    if (limit === undefined && offset === undefined) {
      v1Beta1Proposals =
        (await getAllRpcResponse(
          client.gov.v1beta1.proposals,
          {
            proposalStatus:
              status || ProposalStatus.PROPOSAL_STATUS_UNSPECIFIED,
            voter: '',
            depositor: '',
            pagination: undefined,
          },
          'proposals',
          true,
          true
        )) || []
      total = v1Beta1Proposals.length
    } else {
      const response = await client.gov.v1beta1.proposals(
        {
          proposalStatus: status || ProposalStatus.PROPOSAL_STATUS_UNSPECIFIED,
          voter: '',
          depositor: '',
          pagination: {
            key: new Uint8Array(),
            offset: BigInt(offset || 0),
            limit: BigInt(limit || 0),
            countTotal: true,
            reverse: true,
          },
        },
        true
      )
      v1Beta1Proposals = response.proposals
      total = Number(response.pagination?.total || 0)
    }
  }

  const proposals = await Promise.all([
    ...(v1Beta1Proposals || []).map((proposal) =>
      decodeGovProposal(chainId, {
        version: GovProposalVersion.V1_BETA_1,
        id: proposal.proposalId,
        proposal,
      })
    ),
    ...(v1Proposals || []).map((proposal) =>
      decodeGovProposal(chainId, {
        version: GovProposalVersion.V1,
        id: proposal.id,
        proposal,
      })
    ),
  ])

  return {
    proposals,
    total,
  }
}

/**
 * Fetch a chain governance proposal.
 */
export const fetchGovProposal = async (
  queryClient: QueryClient,
  {
    chainId,
    proposalId,
  }: {
    chainId: string
    proposalId: number
  }
): Promise<GovProposalWithDecodedContent> => {
  const supportsV1 = await queryClient.fetchQuery(
    chainQueries.supportsV1GovModule(queryClient, {
      chainId,
    })
  )

  // Try to load from indexer first.
  const indexerProposal: {
    id: string
    version: string
    data: string
  } | null = await queryClient
    .fetchQuery(
      indexerQueries.queryGeneric(queryClient, {
        chainId,
        formula: 'gov/proposal',
        args: {
          id: proposalId,
        },
      })
    )
    .catch(() => null)

  let govProposal: GovProposalWithDecodedContent | undefined

  if (indexerProposal) {
    if (supportsV1) {
      govProposal = await decodeGovProposal(chainId, {
        version: GovProposalVersion.V1,
        id: BigInt(proposalId),
        proposal: ProposalV1.decode(fromBase64(indexerProposal.data)),
      })
    } else {
      govProposal = await decodeGovProposal(chainId, {
        version: GovProposalVersion.V1_BETA_1,
        id: BigInt(proposalId),
        proposal: ProposalV1Beta1.decode(
          fromBase64(indexerProposal.data),
          undefined,
          true
        ),
      })
    }
  }

  // Fallback to querying chain if indexer failed.
  if (!govProposal) {
    const client = await cosmosProtoRpcClientRouter.connect(chainId)

    if (supportsV1) {
      try {
        const proposal = (
          await client.gov.v1.proposal({
            proposalId: BigInt(proposalId),
          })
        ).proposal
        if (!proposal) {
          throw new Error('Proposal not found')
        }

        govProposal = await decodeGovProposal(chainId, {
          version: GovProposalVersion.V1,
          id: BigInt(proposalId),
          proposal,
        })
      } catch (err) {
        // Fallback to v1beta1 query if v1 not supported.
        if (!isNonexistentQueryError(err)) {
          // Rethrow other errors.
          throw err
        }
      }
    }

    if (!govProposal) {
      const proposal = (
        await client.gov.v1beta1.proposal(
          {
            proposalId: BigInt(proposalId),
          },
          true
        )
      ).proposal
      if (!proposal) {
        throw new Error('Proposal not found')
      }

      govProposal = await decodeGovProposal(chainId, {
        version: GovProposalVersion.V1_BETA_1,
        id: BigInt(proposalId),
        proposal,
      })
    }
  }

  return govProposal
}

/**
 * Fetch the tally for a chain governance proposal.
 */
export const fetchGovProposalTally = async (
  queryClient: QueryClient,
  {
    chainId,
    proposalId,
  }: {
    chainId: string
    proposalId: number
  }
): Promise<TallyResult> => {
  const [client, supportsV1] = await Promise.all([
    cosmosProtoRpcClientRouter.connect(chainId),
    queryClient.fetchQuery(
      chainQueries.supportsV1GovModule(queryClient, {
        chainId,
      })
    ),
  ])

  let tally: TallyResult | undefined

  // Attempt to fetch v1 tally if on v1.
  if (supportsV1) {
    try {
      const { tally: v1Tally } = await client.gov.v1.tallyResult({
        proposalId: BigInt(proposalId),
      })

      // Conform to v1beta1 TallyResult object as it's cleaner.
      tally = v1Tally && {
        yes: v1Tally.yesCount,
        no: v1Tally.noCount,
        abstain: v1Tally.abstainCount,
        noWithVeto: v1Tally.noWithVetoCount,
      }
    } catch (err) {
      // Fallback to v1beta1 query if v1 failed due to a nonexistent query.
      if (!isNonexistentQueryError(err)) {
        // Rethrow other errors.
        throw err
      }
    }
  }

  if (!tally) {
    tally = (
      await client.gov.v1beta1.tallyResult({
        proposalId: BigInt(proposalId),
      })
    ).tally
  }

  if (!tally) {
    throw new Error('Tally not found')
  }

  return tally
}

/**
 * Fetch a vote for a chain governance proposal.
 */
export const fetchGovProposalVote = async (
  queryClient: QueryClient,
  {
    chainId,
    proposalId,
    voter,
  }: {
    chainId: string
    proposalId: number
    voter: string
  }
): Promise<WeightedVoteOption[]> => {
  const [client, supportsV1] = await Promise.all([
    cosmosProtoRpcClientRouter.connect(chainId),
    queryClient.fetchQuery(
      chainQueries.supportsV1GovModule(queryClient, {
        chainId,
      })
    ),
  ])

  let vote: WeightedVoteOption[] | undefined

  try {
    // Attempt to fetch v1 vote if on v1.
    if (supportsV1) {
      try {
        vote = (
          await client.gov.v1.vote({
            proposalId: BigInt(proposalId),
            voter,
          })
        ).vote?.options
      } catch (err) {
        // Fallback to v1beta1 query if v1 failed due to a nonexistent query.
        if (!isNonexistentQueryError(err)) {
          // Rethrow other errors.
          throw err
        }
      }
    }

    if (!vote) {
      vote = (
        await client.gov.v1beta1.vote({
          proposalId: BigInt(proposalId),
          voter,
        })
      ).vote?.options
    }
  } catch (err) {
    // If not found, the voter has not yet voted.
    if (
      err instanceof Error &&
      err.message.includes('not found for proposal')
    ) {
      return []
    }

    // Rethrow other errors.
    throw err
  }

  if (!vote) {
    throw new Error('Vote not found')
  }

  return vote
}

/**
 * Fetch paginated votes for a chain governance proposal.
 */
export const fetchGovProposalVotes = async (
  queryClient: QueryClient,
  {
    chainId,
    proposalId,
    offset,
    limit,
  }: {
    chainId: string
    proposalId: number
    offset: number
    limit: number
  }
): Promise<{
  /**
   * Paginated votes with staked amounts.
   */
  votes: (Vote & { staked: HugeDecimal })[]
  /**
   * Total votes cast.
   */
  total: HugeDecimal
}> => {
  const client = await cosmosProtoRpcClientRouter.connect(chainId)

  const { votes, pagination } = await client.gov.v1beta1.votes({
    proposalId: BigInt(proposalId),
    pagination: {
      key: new Uint8Array(),
      offset: BigInt(offset),
      limit: BigInt(limit),
      countTotal: true,
      reverse: true,
    },
  })

  const stakes = await Promise.all(
    votes.map(({ voter }) =>
      queryClient.fetchQuery(
        chainQueries.nativeStakedBalance({
          chainId,
          address: voter,
        })
      )
    )
  )

  return {
    votes: votes.map((vote, index) => ({
      ...vote,
      staked: HugeDecimal.from(stakes[index].amount),
    })),
    total: HugeDecimal.from(pagination?.total ?? 0),
  }
}

/**
 * Fetch chain registry assets for chain.
 */
export const fetchChainRegistryAssets = async ({
  chainId,
}: {
  chainId: string
}): Promise<Asset[]> =>
  (
    await (
      await fetch(
        `https://raw.githubusercontent.com/cosmos/chain-registry/master/${
          getChainForChainId(chainId).chainName
        }/assetlist.json`
      )
    ).json()
  ).assets

export const chainQueries = {
  /**
   * Fetch the module address associated with the specified name.
   */
  moduleAddress: (options: Parameters<typeof fetchChainModuleAddress>[0]) =>
    queryOptions({
      queryKey: ['chain', 'moduleAddress', options],
      queryFn: () => fetchChainModuleAddress(options),
    }),
  /**
   * Fetch the module name associated with the specified address. Returns null
   * if not a module account.
   */
  moduleName: (options: Parameters<typeof fetchChainModuleName>[0]) =>
    queryOptions({
      queryKey: ['chain', 'moduleName', options],
      queryFn: () => fetchChainModuleName(options),
    }),
  /**
   * Check whether or not the address is a chain module, optionally with a
   * specific name.
   */
  isAddressModule: (
    queryClient: QueryClient,
    options: Parameters<typeof isAddressModule>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'isAddressModule', options],
      queryFn: () => isAddressModule(queryClient, options),
    }),
  /**
   * Fetch the timestamp for a given block height.
   */
  blockTimestamp: (options: Parameters<typeof fetchBlockTimestamp>[0]) =>
    queryOptions({
      queryKey: ['chain', 'blockTimestamp', options],
      queryFn: () => fetchBlockTimestamp(options),
    }),
  /**
   * Fetch the balance for a given address and denom.
   */
  balance: (options: Parameters<typeof fetchBalance>[0]) =>
    queryOptions({
      queryKey: ['chain', 'balance', options],
      queryFn: () => fetchBalance(options),
    }),
  /**
   * Fetch the native token balance for a given address.
   */
  nativeBalance: (options: Omit<Parameters<typeof fetchBalance>[0], 'denom'>) =>
    chainQueries.balance({
      ...options,
      denom: getNativeTokenForChainId(options.chainId).denomOrAddress,
    }),
  /**
   * Fetch the sum of native tokens staked across all validators.
   */
  nativeStakedBalance: (
    options?: Parameters<typeof fetchNativeStakedBalance>[0]
  ) =>
    queryOptions({
      queryKey: ['chain', 'nativeStakedBalance', options],
      queryFn: options ? () => fetchNativeStakedBalance(options) : skipToken,
    }),
  /**
   * Fetch the total native tokens staked across the whole chain.
   */
  totalNativeStakedBalance: (
    options: Parameters<typeof fetchTotalNativeStakedBalance>[0]
  ) =>
    queryOptions({
      queryKey: ['chain', 'totalNativeStakedBalance', options],
      queryFn: () => fetchTotalNativeStakedBalance(options),
    }),
  /**
   * Fetch native delegation info.
   */
  nativeDelegationInfo: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchNativeDelegationInfo>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'nativeDelegationInfo', options],
      queryFn: () => fetchNativeDelegationInfo(queryClient, options),
    }),
  /**
   * Fetch the unstaking duration in seconds for the native token.
   */
  nativeUnstakingDurationSeconds: (
    options: Parameters<typeof fetchNativeUnstakingDurationSeconds>[0]
  ) =>
    queryOptions({
      queryKey: ['chain', 'nativeUnstakingDurationSeconds', options],
      queryFn: () => fetchNativeUnstakingDurationSeconds(options),
    }),
  /**
   * Fetch a validator.
   */
  validator: (options: Parameters<typeof fetchValidator>[0]) =>
    queryOptions({
      queryKey: ['chain', 'validator', options],
      queryFn: () => fetchValidator(options),
    }),
  /**
   * Fetch the dynamic gas price for the native fee token.
   */
  dynamicGasPrice: (options: Parameters<typeof fetchDynamicGasPrice>[0]) =>
    queryOptions({
      queryKey: ['chain', 'dynamicGasPrice', options],
      queryFn: () => fetchDynamicGasPrice(options),
    }),
  /**
   * Fetch the on-chain metadata for a denom if it exists.
   */
  denomMetadata: (options: Parameters<typeof fetchDenomMetadata>[0]) =>
    queryOptions({
      queryKey: ['chain', 'denomMetadata', options],
      queryFn: () => fetchDenomMetadata(options),
    }),
  /**
   * Fetch the cosmos-sdk version of a chain.
   */
  cosmosSdkVersion: (
    options: Parameters<typeof fetchChainCosmosSdkVersion>[0]
  ) =>
    queryOptions({
      queryKey: ['chain', 'cosmosSdkVersion', options],
      queryFn: () => fetchChainCosmosSdkVersion(options),
    }),
  /**
   * Fetch whether or not a chain supports the v1 gov module.
   */
  supportsV1GovModule: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchChainSupportsV1GovModule>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'supportsV1GovModule', options],
      queryFn: () => fetchChainSupportsV1GovModule(queryClient, options),
    }),
  /**
   * Fetch whether or not a chain supports the ICA controller module.
   */
  supportsIcaController: (
    options: Parameters<typeof fetchSupportsIcaController>[0]
  ) =>
    queryOptions({
      queryKey: ['chain', 'supportsIcaController', options],
      queryFn: () => fetchSupportsIcaController(options),
    }),
  /**
   * Fetch governance module params.
   */
  govParams: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchGovParams>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'govParams', options],
      queryFn: () => fetchGovParams(queryClient, options),
    }),
  /**
   * Search chain governance proposals.
   */
  searchGovProposals: (options: SearchGovProposalsOptions) =>
    queryOptions({
      queryKey: ['chain', 'searchGovProposals', options],
      queryFn: () => searchGovProposals(options),
    }),
  /**
   * Search chain governance proposals and decode their content.
   */
  searchAndDecodeGovProposals: (
    queryClient: QueryClient,
    options: Parameters<typeof searchAndDecodeGovProposals>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'searchAndDecodeGovProposals', options],
      queryFn: () => searchAndDecodeGovProposals(queryClient, options),
    }),
  /**
   * Fetch the governance proposals for a chain, defaulting to those that are
   * currently open for voting.
   */
  govProposals: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchGovProposals>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'govProposals', options],
      queryFn: () => fetchGovProposals(queryClient, options),
    }),
  /**
   * Fetch a chain governance proposal.
   */
  govProposal: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchGovProposal>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'govProposal', options],
      queryFn: () => fetchGovProposal(queryClient, options),
    }),
  /**
   * Fetch the tally for a chain governance proposal.
   */
  govProposalTally: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchGovProposalTally>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'govProposalTally', options],
      queryFn: () => fetchGovProposalTally(queryClient, options),
    }),
  /**
   * Fetch a vote for a chain governance proposal.
   */
  govProposalVote: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchGovProposalVote>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'govProposalVote', options],
      queryFn: () => fetchGovProposalVote(queryClient, options),
    }),
  /**
   * Fetch paginated votes for a chain governance proposal.
   */
  govProposalVotes: (
    queryClient: QueryClient,
    options: Parameters<typeof fetchGovProposalVotes>[1]
  ) =>
    queryOptions({
      queryKey: ['chain', 'govProposalVotes', options],
      queryFn: () => fetchGovProposalVotes(queryClient, options),
    }),
  /**
   * Fetch chain registry assets for chain.
   */
  chainRegistryAssets: (
    options: Parameters<typeof fetchChainRegistryAssets>[0]
  ) =>
    queryOptions({
      queryKey: ['chain', 'chainRegistryAssets', options],
      queryFn: () => fetchChainRegistryAssets(options),
    }),
}
