import { parsePacketsFromTendermintEvents } from '@confio/relayer/build/lib/utils'
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { Coin, IndexedTx, StargateClient } from '@cosmjs/stargate'
import {
  noWait,
  selector,
  selectorFamily,
  waitForAll,
  waitForAny,
} from 'recoil'

import {
  AccountType,
  AmountWithTimestamp,
  ChainId,
  GenericTokenBalance,
  GenericTokenBalanceWithOwner,
  GovProposalWithDecodedContent,
  TokenType,
  Validator,
  ValidatorSlash,
  WithChainId,
} from '@dao-dao/types'
import { ModuleAccount } from '@dao-dao/types/protobuf/codegen/cosmos/auth/v1beta1/auth'
import { Metadata } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/bank'
import { DecCoin } from '@dao-dao/types/protobuf/codegen/cosmos/base/v1beta1/coin'
import {
  ProposalStatus,
  WeightedVoteOption,
} from '@dao-dao/types/protobuf/codegen/cosmos/gov/v1beta1/gov'
import {
  Pool,
  Validator as RpcValidator,
} from '@dao-dao/types/protobuf/codegen/cosmos/staking/v1beta1/staking'
import { Packet } from '@dao-dao/types/protobuf/codegen/ibc/core/channel/v1/channel'
import {
  MAINNET,
  SecretCosmWasmClient,
  bitsongProtoRpcClientRouter,
  cosmosProtoRpcClientRouter,
  cosmosSdkVersionIs46OrHigher,
  cosmosSdkVersionIs47OrHigher,
  cosmosValidatorToValidator,
  cosmwasmProtoRpcClientRouter,
  getAllRpcResponse,
  getCosmWasmClientForChainId,
  getNativeTokenForChainId,
  ibcProtoRpcClientRouter,
  junoProtoRpcClientRouter,
  kujiraProtoRpcClientRouter,
  neutronProtoRpcClientRouter,
  nobleProtoRpcClientRouter,
  osmosisProtoRpcClientRouter,
  secretCosmWasmClientRouter,
  stargateClientRouter,
} from '@dao-dao/utils'

import { chainQueries } from '../../query'
import { queryClientAtom } from '../atoms'
import {
  refreshBlockHeightAtom,
  refreshGovProposalsAtom,
  refreshIbcDataAtom,
  refreshOpenProposalsAtom,
  refreshWalletBalancesIdAtom,
} from '../atoms/refresh'
import {
  queryGenericIndexerSelector,
  queryValidatorIndexerSelector,
} from './indexer'
import { genericTokenSelector } from './token'
import { walletTokenDaoStakedDenomsSelector } from './wallet'

export const stargateClientForChainSelector = selectorFamily<
  StargateClient,
  string
>({
  key: 'stargateClientForChain',
  get: (chainId) => async () => await stargateClientRouter.connect(chainId),
  dangerouslyAllowMutability: true,
})

export const cosmWasmClientForChainSelector = selectorFamily<
  CosmWasmClient,
  string
>({
  key: 'cosmWasmClientForChain',
  get: (chainId) => async () => await getCosmWasmClientForChainId(chainId),
  dangerouslyAllowMutability: true,
})

export const secretCosmWasmClientForChainSelector = selectorFamily<
  SecretCosmWasmClient,
  string
>({
  key: 'secretCosmWasmClientForChain',
  get: (chainId) => async () =>
    await secretCosmWasmClientRouter.connect(chainId),
  dangerouslyAllowMutability: true,
})

export const cosmosRpcClientForChainSelector = selectorFamily({
  key: 'cosmosRpcClientForChain',
  get: (chainId: string) => async () =>
    await cosmosProtoRpcClientRouter.connect(chainId),
  dangerouslyAllowMutability: true,
})

export const ibcRpcClientForChainSelector = selectorFamily({
  key: 'ibcRpcClientForChain',
  get: (chainId: string) => async () =>
    await ibcProtoRpcClientRouter.connect(chainId),
  dangerouslyAllowMutability: true,
})

export const cosmwasmRpcClientForChainSelector = selectorFamily({
  key: 'cosmwasmRpcClientForChain',
  get: (chainId: string) => async () =>
    await cosmwasmProtoRpcClientRouter.connect(chainId),
  dangerouslyAllowMutability: true,
})

export const osmosisRpcClientForChainSelector = selectorFamily({
  key: 'osmosisRpcClientForChain',
  get: (chainId: string) => async () =>
    await osmosisProtoRpcClientRouter.connect(chainId),
  dangerouslyAllowMutability: true,
})

export const nobleRpcClientSelector = selector({
  key: 'nobleRpcClient',
  get: async () =>
    await nobleProtoRpcClientRouter.connect(ChainId.NobleMainnet),
  dangerouslyAllowMutability: true,
})

export const neutronRpcClientSelector = selector({
  key: 'neutronRpcClient',
  get: async () =>
    await neutronProtoRpcClientRouter.connect(
      MAINNET ? ChainId.NeutronMainnet : ChainId.NeutronTestnet
    ),
  dangerouslyAllowMutability: true,
})

export const junoRpcClientSelector = selector({
  key: 'junoRpcClient',
  get: async () =>
    await junoProtoRpcClientRouter.connect(
      MAINNET ? ChainId.JunoMainnet : ChainId.JunoTestnet
    ),
  dangerouslyAllowMutability: true,
})

export const blockHeightSelector = selectorFamily<number, WithChainId<{}>>({
  key: 'blockHeight',
  get:
    ({ chainId }) =>
    async ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      get(refreshBlockHeightAtom)
      return await client.getHeight()
    },
})

export const blockHeightTimestampSelector = selectorFamily<
  Date,
  WithChainId<{ blockHeight: number }>
>({
  key: 'blockHeightTimestamp',
  get:
    ({ blockHeight, chainId }) =>
    async ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      const block = await client.getBlock(blockHeight)
      return new Date(Date.parse(block.header.time))
    },
})

export const blockHeightTimestampSafeSelector = selectorFamily<
  Date | undefined,
  WithChainId<{ blockHeight: number }>
>({
  key: 'blockHeightTimestamp',
  get:
    ({ blockHeight, chainId }) =>
    async ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))
      try {
        const block = await client.getBlock(blockHeight)
        return new Date(Date.parse(block.header.time))
      } catch (error) {
        console.error(error)
      }
    },
})

export const cosmosSdkVersionSelector = selectorFamily<string, WithChainId<{}>>(
  {
    key: 'cosmosSdkVersion',
    get:
      ({ chainId }) =>
      async ({ get }) => {
        const client = get(cosmosRpcClientForChainSelector(chainId))
        const { applicationVersion } =
          await client.base.tendermint.v1beta1.getNodeInfo()
        // Remove `v` prefix.
        return applicationVersion?.cosmosSdkVersion.slice(1) || '0.0.0'
      },
  }
)

/**
 * A chain supports the v1 gov module if it uses Cosmos SDK v0.46 or higher.
 */
export const chainSupportsV1GovModuleSelector = selectorFamily<
  boolean,
  WithChainId<{
    // Whether or not v0.47 or higher is required. V1 gov is supported by
    // v0.46+, but some other things, like unified gov params, are supported
    // only on v0.47+.
    require47?: boolean
  }>
>({
  key: 'chainSupportsV1GovModule',
  get:
    ({ require47, ...params }) =>
    async ({ get }) => {
      const client = get(cosmosRpcClientForChainSelector(params.chainId))
      const version = get(cosmosSdkVersionSelector(params))

      if (
        !(
          require47
            ? cosmosSdkVersionIs47OrHigher
            : cosmosSdkVersionIs46OrHigher
        )(version)
      ) {
        return false
      }

      // Double-check by testing a v1 gov route.
      try {
        await client.gov.v1.params({
          paramsType: 'voting',
        })
        return true
      } catch {
        return false
      }
    },
})

export const justNativeBalancesSelector = selectorFamily<
  readonly Coin[],
  WithChainId<{ address: string }>
>({
  key: 'justNativeBalances',
  get:
    ({ address, chainId }) =>
    async ({ get }) => {
      const client = get(stargateClientForChainSelector(chainId))
      get(refreshWalletBalancesIdAtom(address))
      return await client.getAllBalances(address)
    },
})

export const nativeBalancesSelector = selectorFamily<
  GenericTokenBalance[],
  WithChainId<{ address: string }>
>({
  key: 'nativeBalances',
  get:
    ({ address, chainId }) =>
    ({ get }) => {
      get(refreshWalletBalancesIdAtom(address))

      const balances = [
        ...get(justNativeBalancesSelector({ address, chainId })),
      ]
      const nativeToken = getNativeTokenForChainId(chainId)
      const stakedDenoms =
        get(
          noWait(
            walletTokenDaoStakedDenomsSelector({
              walletAddress: address,
              chainId,
            })
          )
        ).valueMaybe() || []

      const uniqueDenoms = new Set(balances.map(({ denom }) => denom))

      // Add native denom if not present.
      if (!uniqueDenoms.has(nativeToken.denomOrAddress)) {
        balances.push({
          amount: '0',
          denom: nativeToken.denomOrAddress,
        })
        uniqueDenoms.add(nativeToken.denomOrAddress)
      }

      // Add denoms staked to DAOs if not present.
      stakedDenoms.forEach((denom) => {
        if (!uniqueDenoms.has(denom)) {
          balances.push({ amount: '0', denom })
          uniqueDenoms.add(denom)
        }
      })

      const tokenLoadables = get(
        waitForAny(
          balances.map(({ denom }) =>
            genericTokenSelector({
              type: TokenType.Native,
              denomOrAddress: denom,
              chainId,
            })
          )
        )
      )

      return tokenLoadables
        .map((token, index) => ({
          token: token.state === 'hasValue' ? token.contents : undefined,
          balance: balances[index].amount,
        }))
        .filter(({ token }) => token !== undefined) as GenericTokenBalance[]
    },
})

export const tokenFactoryDenomCreationFeeSelector = selectorFamily<
  Coin[] | undefined,
  string
>({
  key: 'tokenFactoryDenomCreationFee',
  get:
    (chainId) =>
    async ({ get }) => {
      if (
        chainId === ChainId.KujiraTestnet ||
        chainId === ChainId.KujiraMainnet
      ) {
        const kujiraClient = await kujiraProtoRpcClientRouter.connect(chainId)
        const { params } = await kujiraClient.denom.params()
        return params?.creationFee
      }

      if (
        chainId === ChainId.BitsongMainnet ||
        chainId === ChainId.BitsongTestnet
      ) {
        const bitsongClient = await bitsongProtoRpcClientRouter.connect(chainId)
        const { params } = await bitsongClient.fantoken.v1beta1.params()
        return params?.issueFee && [params.issueFee]
      }

      const osmosisClient = get(osmosisRpcClientForChainSelector(chainId))
      try {
        return (await osmosisClient.tokenfactory.v1beta1.params()).params
          ?.denomCreationFee
      } catch (err) {
        // If Osmosis query failed, try CosmWasm tokenfactory.
        if (
          err instanceof Error &&
          err.message.includes('unknown query path')
        ) {
          const cosmwasmClient = get(cosmwasmRpcClientForChainSelector(chainId))
          return (await cosmwasmClient.tokenfactory.v1beta1.params()).params
            ?.denomCreationFee
        }

        throw err
      }
    },
})

export const nativeDenomBalanceSelector = selectorFamily<
  Coin,
  WithChainId<{ walletAddress: string; denom: string }>
>({
  key: 'nativeDenomBalance',
  get:
    ({ walletAddress, denom, chainId }) =>
    async ({ get }) => {
      const client = get(stargateClientForChainSelector(chainId))

      get(refreshWalletBalancesIdAtom(walletAddress))

      return await client.getBalance(walletAddress, denom)
    },
})

export const nativeDenomBalanceWithTimestampSelector = selectorFamily<
  AmountWithTimestamp,
  WithChainId<{ walletAddress: string; denom: string }>
>({
  key: 'nativeDenomBalanceWithTimestamp',
  get:
    ({ walletAddress, denom, chainId }) =>
    ({ get }) => {
      const amount = Number(
        get(nativeDenomBalanceSelector({ walletAddress, denom, chainId }))
          .amount
      )

      return {
        amount,
        timestamp: Date.now(),
      }
    },
})

// Get the sum of native tokens delegated across all validators
export const nativeDelegatedBalanceSelector = selectorFamily<
  Coin,
  WithChainId<{ address: string }>
>({
  key: 'nativeDelegatedBalance',
  get:
    ({ address, chainId }) =>
    async ({ get }) => {
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

      const client = get(stargateClientForChainSelector(chainId))

      get(refreshWalletBalancesIdAtom(address))

      const balance = await client.getBalanceStaked(address)
      return (
        balance ?? {
          amount: '0',
          denom: getNativeTokenForChainId(chainId).denomOrAddress,
        }
      )
    },
})

export const nativeSupplySelector = selectorFamily<
  number,
  WithChainId<{ denom: string }>
>({
  key: 'nativeSupply',
  get:
    ({ denom, chainId }) =>
    async ({ get }) => {
      const client = get(cosmosRpcClientForChainSelector(chainId))

      return Number(
        (
          await client.bank.v1beta1.supplyOf({
            denom,
          })
        ).amount?.amount ?? -1
      )
    },
})

export const blocksPerYearSelector = selectorFamily<number, WithChainId<{}>>({
  key: 'blocksPerYear',
  get:
    ({ chainId }) =>
    async ({ get }) => {
      // If on juno mainnet or testnet, use juno RPC.
      if (chainId === ChainId.JunoMainnet || chainId === ChainId.JunoTestnet) {
        const client = get(junoRpcClientSelector)
        return Number((await client.mint.params()).params?.blocksPerYear ?? -1)
      }

      const client = get(cosmosRpcClientForChainSelector(chainId))
      try {
        return Number(
          (await client.mint.v1beta1.params()).params?.blocksPerYear ?? -1
        )
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes('unknown query path')
        ) {
          return -1
        }

        // Rethrow other errors.
        throw err
      }
    },
})

export const nativeUnstakingDurationSecondsSelector = selectorFamily<
  number,
  WithChainId<{}>
>({
  key: 'nativeUnstakingDurationSeconds',
  get:
    ({ chainId }) =>
    async ({ get }) => {
      // Neutron does not have staking.
      if (
        chainId === ChainId.NeutronMainnet ||
        chainId === ChainId.NeutronTestnet
      ) {
        return 0
      }

      const client = get(cosmosRpcClientForChainSelector(chainId))
      try {
        const { params } = await client.staking.v1beta1.params()
        return Number(params?.unbondingTime?.seconds ?? -1)
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes('unknown query path')
        ) {
          return 0
        }

        // Rethrow other errors.
        throw err
      }
    },
})

// Keeping this around for now (even though query exists for it now) because
// it's used in the open proposals feed selector and allows partial loading.
// Once we convert the open proposals feed to a query, we can remove this.
export const govProposalsSelector = selectorFamily<
  {
    proposals: GovProposalWithDecodedContent[]
    total: number
  },
  WithChainId<{
    status?: ProposalStatus
    offset?: number
    limit?: number
  }>
>({
  key: 'govProposals',
  get:
    (options) =>
    async ({ get }) => {
      get(refreshGovProposalsAtom(options.chainId))

      if (
        options.status === ProposalStatus.PROPOSAL_STATUS_DEPOSIT_PERIOD ||
        options.status === ProposalStatus.PROPOSAL_STATUS_VOTING_PERIOD
      ) {
        get(refreshOpenProposalsAtom)
      }

      const queryClient = get(queryClientAtom)
      return await queryClient.fetchQuery(
        chainQueries.govProposals(queryClient, options)
      )
    },
})

// Keeping this around for now (even though query exists for it now) because
// it's used in the open proposals feed selector and allows partial loading.
// Once we convert the open proposals feed to a query, we can remove this.
export const govProposalVoteSelector = selectorFamily<
  WeightedVoteOption[],
  WithChainId<{ proposalId: number; voter: string }>
>({
  key: 'govProposalVote',
  get:
    (options) =>
    async ({ get }) => {
      get(refreshGovProposalsAtom(options.chainId))

      const queryClient = get(queryClientAtom)
      return await queryClient.fetchQuery(
        chainQueries.govProposalVote(queryClient, options)
      )
    },
})

// Get module name for address or undefined if not a module account.
export const moduleNameForAddressSelector = selectorFamily<
  string | undefined,
  WithChainId<{ address: string }>
>({
  key: 'moduleNameForAddress',
  get:
    ({ address, chainId }) =>
    async ({ get }) => {
      const client = get(cosmosRpcClientForChainSelector(chainId))
      try {
        const response = await client.auth.v1beta1.account({
          address,
        })

        if (
          response.account &&
          'typeUrl' in response.account &&
          response.account.typeUrl === ModuleAccount.typeUrl
        ) {
          const moduleAccount = ModuleAccount.decode(response.account.value)
          return moduleAccount.name
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes('not found: key not found')
        ) {
          return
        }

        // Rethrow other errors.
        throw err
      }
    },
})

// Get bonded and unbonded tokens. Bonded tokens represent all possible
// governance voting power.
export const chainStakingPoolSelector = selectorFamily<Pool, WithChainId<{}>>({
  key: 'chainStakingPool',
  get:
    ({ chainId }) =>
    async ({ get }) => {
      const client = get(cosmosRpcClientForChainSelector(chainId))
      const { pool } = await client.staking.v1beta1.pool()
      if (!pool) {
        throw new Error('Staking pool not found')
      }
      return pool
    },
})

export const communityPoolBalancesSelector = selectorFamily<
  GenericTokenBalanceWithOwner[],
  WithChainId<{}>
>({
  key: 'communityPoolBalances',
  get:
    ({ chainId }) =>
    async ({ get }) => {
      let pool: DecCoin[]

      const poolMap: Record<string, string> | undefined = get(
        queryGenericIndexerSelector({
          chainId,
          formula: 'communityPool/balances',
        })
      )
      if (poolMap) {
        pool = Object.entries(poolMap).map(
          ([denom, amount]): DecCoin => ({
            denom,
            amount,
          })
        )

        // Fallback to querying chain if indexer failed.
      } else {
        const client = get(cosmosRpcClientForChainSelector(chainId))
        pool = (await client.distribution.v1beta1.communityPool()).pool
      }

      const tokens = get(
        waitForAll(
          pool.map(({ denom }) =>
            genericTokenSelector({
              chainId,
              type: TokenType.Native,
              denomOrAddress: denom,
            })
          )
        )
      )

      // In case any chain has a community pool but no gov module, handle
      // gracefully by falling back to chain ID. I doubt this will ever happen,
      // but why not be safe... Cosmos is crazy.
      const queryClient = get(queryClientAtom)
      const owner = await queryClient
        .fetchQuery(
          chainQueries.moduleAddress({
            chainId,
            name: 'gov',
          })
        )
        .catch(() => chainId)

      const balances = tokens.map(
        (token, i): GenericTokenBalanceWithOwner => ({
          owner: {
            type: AccountType.Base,
            chainId,
            address: owner,
          },
          token,
          // Truncate.
          balance: pool[i].amount.split('.')[0],
        })
      )

      return balances
    },
})

export const validatorsSelector = selectorFamily<Validator[], WithChainId<{}>>({
  key: 'validators',
  get:
    ({ chainId }) =>
    async ({ get }) => {
      get(refreshWalletBalancesIdAtom(''))

      const client = get(cosmosRpcClientForChainSelector(chainId))

      let validators: RpcValidator[]
      try {
        validators = await getAllRpcResponse(
          client.staking.v1beta1.validators,
          {
            status: '',
            pagination: undefined,
          },
          'validators'
        )
      } catch (err) {
        console.error(err)
        return []
      }

      return validators
        .map((validator) => cosmosValidatorToValidator(validator))
        .sort((a, b) => b.tokens.minus(a.tokens).toNumber())
    },
})

export const transactionSelector = selectorFamily<
  IndexedTx | undefined,
  WithChainId<{ txHash: string }>
>({
  key: 'transaction',
  get:
    ({ txHash, chainId }) =>
    async ({ get }) => {
      const client = get(cosmWasmClientForChainSelector(chainId))

      const tx = await client.getTx(txHash)
      return tx ?? undefined
    },
})

export const transactionPacketsSelector = selectorFamily<
  Packet[] | undefined,
  WithChainId<{ txHash: string }>
>({
  key: 'transactionPackets',
  get:
    (params) =>
    async ({ get }) => {
      const tx = get(transactionSelector(params))
      return tx && parsePacketsFromTendermintEvents(tx.events)
    },
})

// TODO(indexer): Use TX events indexer for this instead.
export const validatorSlashesSelector = selectorFamily<
  ValidatorSlash[],
  WithChainId<{ validatorOperatorAddress: string }>
>({
  key: 'validatorSlashes',
  get:
    ({ validatorOperatorAddress, chainId }) =>
    async ({ get }) =>
      (await get(
        queryValidatorIndexerSelector({
          validatorOperatorAddress,
          chainId,
          formula: 'staking/slashes',
          noFallback: true,
        })
      )) ?? [],
})

export const denomMetadataSelector = selectorFamily<
  Metadata | undefined,
  WithChainId<{ denom: string }>
>({
  key: 'denomMetadata',
  get:
    ({ denom, chainId }) =>
    async ({ get }) => {
      const client = get(cosmosRpcClientForChainSelector(chainId))

      try {
        const { metadata } = await client.bank.v1beta1.denomMetadata({
          denom,
        })
        return metadata
      } catch (err) {
        // If denom not found, return undefined.
        if (err instanceof Error && err.message.includes('key not found')) {
          return
        }

        // Rethrow other errors.
        throw err
      }
    },
})

export const ibcUnreceivedPacketsSelector = selectorFamily<
  // Returns whether or not all of the IBC packet sequences have been received.
  boolean,
  WithChainId<{
    portId: string
    channelId: string
    packetCommitmentSequences: number[]
  }>
>({
  key: 'ibcUnreceivedPackets',
  get:
    ({ chainId, portId, channelId, packetCommitmentSequences }) =>
    async ({ get }) => {
      get(refreshIbcDataAtom(chainId))
      const ibcClient = get(ibcRpcClientForChainSelector(chainId))
      const { sequences } = await ibcClient.core.channel.v1.unreceivedPackets({
        portId,
        channelId,
        packetCommitmentSequences: packetCommitmentSequences.map((v) =>
          BigInt(v)
        ),
      })
      return sequences.some((s) =>
        packetCommitmentSequences.includes(Number(s))
      )
    },
})

export const ibcUnreceivedAcksSelector = selectorFamily<
  // Returns whether or not all of the IBC packet acks have been received.
  boolean,
  WithChainId<{
    portId: string
    channelId: string
    packetAckSequences: number[]
  }>
>({
  key: 'ibcUnreceivedAcks',
  get:
    ({ chainId, portId, channelId, packetAckSequences }) =>
    async ({ get }) => {
      get(refreshIbcDataAtom(chainId))
      const ibcClient = get(ibcRpcClientForChainSelector(chainId))
      const { sequences } = await ibcClient.core.channel.v1.unreceivedAcks({
        portId,
        channelId,
        packetAckSequences: packetAckSequences.map((v) => BigInt(v)),
      })
      return sequences.some((s) => packetAckSequences.includes(Number(s)))
    },
})

export const ibcAckReceivedSelector = selectorFamily<
  // Returns whether or not the IBC packet acknowledgement was received.
  boolean,
  WithChainId<{
    portId: string
    channelId: string
    sequence: number
  }>
>({
  key: 'ibcAckReceived',
  get:
    ({ chainId, portId, channelId, sequence }) =>
    async ({ get }) => {
      get(refreshIbcDataAtom(chainId))
      const ibcClient = get(ibcRpcClientForChainSelector(chainId))
      try {
        await ibcClient.core.channel.v1.packetAcknowledgement({
          portId,
          channelId,
          sequence: BigInt(sequence),
        })
        return true
      } catch (err) {
        return false
      }
    },
})
