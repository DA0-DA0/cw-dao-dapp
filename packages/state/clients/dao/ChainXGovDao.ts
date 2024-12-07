import {
  FetchQueryOptions,
  QueryClient,
  skipToken,
} from '@tanstack/react-query'

import { AnyChain, DaoInfo } from '@dao-dao/types'
import {
  TotalPowerAtHeightResponse,
  VotingPowerAtHeightResponse,
} from '@dao-dao/types/contracts/DaoDaoCore'
import {
  getChainForChainId,
  mustGetConfiguredChainConfig,
} from '@dao-dao/utils'

import { chainQueries, daoQueries } from '../../query'
import { DaoBase } from './base'

export class ChainXGovDao extends DaoBase {
  protected _info: DaoInfo | undefined

  constructor(
    queryClient: QueryClient,
    protected readonly options: {
      chainId: string
    }
  ) {
    super(queryClient)

    // Attempt immediate initialization if query is cached.
    this._info = this.queryClient.getQueryData(
      daoQueries.info(this.queryClient, {
        chainId: this.options.chainId,
        coreAddress: mustGetConfiguredChainConfig(this.options.chainId).name,
      }).queryKey
    )
  }

  async init() {
    if (this.initialized) {
      return
    }

    this._info = await this.queryClient.fetchQuery(
      daoQueries.info(this.queryClient, {
        chainId: this.options.chainId,
        coreAddress: mustGetConfiguredChainConfig(this.options.chainId).name,
      })
    )
  }

  get initialized() {
    return !!this._info
  }

  get info(): DaoInfo {
    if (!this._info) {
      throw new Error('Not initialized')
    }
    return this._info
  }

  get chainId(): string {
    return this.options.chainId
  }

  get chain(): AnyChain {
    return getChainForChainId(this.chainId)
  }

  get coreAddress(): string {
    return mustGetConfiguredChainConfig(this.options.chainId).name
  }

  getVotingPowerQuery(
    address?: string
  ): FetchQueryOptions<VotingPowerAtHeightResponse> {
    // If no address, return query in loading state.
    if (!address) {
      return {
        queryKey: [],
        queryFn: skipToken,
      }
    }

    return daoQueries.chainVotingPower(this.queryClient, {
      chainId: this.options.chainId,
      address,
    })
  }

  getTotalVotingPowerQuery(): FetchQueryOptions<TotalPowerAtHeightResponse> {
    return daoQueries.chainTotalPower(this.queryClient, {
      chainId: this.options.chainId,
    })
  }

  async getProposalCount(): Promise<number> {
    // Get proposal count by loading one proposal and getting the total.
    return (
      await this.queryClient.fetchQuery(
        chainQueries.govProposals(this.queryClient, {
          chainId: this.options.chainId,
          limit: 1,
        })
      )
    ).total
  }
}
