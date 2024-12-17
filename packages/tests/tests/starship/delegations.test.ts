import { describe, expect, it } from 'vitest'

import { chainQueries, daoVoteDelegationQueries } from '@dao-dao/state'
import {
  CwDao,
  SingleChoiceProposalModule,
  TokenStakedVotingModule,
} from '@dao-dao/state/clients'
import { CwAdminFactoryClient } from '@dao-dao/state/contracts/CwAdminFactory'
import { ManageWidgetsAction } from '@dao-dao/stateful/actions/core/actions'
import {
  ActionChainContextType,
  ActionContextType,
  WidgetId,
} from '@dao-dao/types'
import {
  CHAIN_GAS_MULTIPLIER,
  ContractName,
  findWasmAttributeValue,
  instantiateSmartContract,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { suite } from './common'

describe('delegations', () => {
  it('should create a token-based DAO with delegations', async () => {
    const chainConfig = mustGetSupportedChainConfig(suite.chainId)

    const signers = await suite.makeSigners(100)

    const totalSupply = 1_000_000
    const initialBalance = 100
    const initialDaoBalance = totalSupply - initialBalance * signers.length

    const factoryTokenDenomCreationFee = await suite.queryClient.fetchQuery(
      chainQueries.tokenFactoryDenomCreationFee({ chainId: suite.chainId })
    )

    const votingModuleInfo =
      TokenStakedVotingModule.generateModuleInstantiateInfo(suite.chainId, {
        token: {
          new: {
            symbol: 'TEST',
            decimals: 6,
            name: 'Test Token',
            initialBalances: signers.map(({ address }) => ({
              address,
              amount: initialBalance.toString(),
            })),
            initialDaoBalance: initialDaoBalance.toString(),
            funds: factoryTokenDenomCreationFee,
          },
        },
      })

    const proposalModuleSingleInfo =
      SingleChoiceProposalModule.generateModuleInstantiateInfo(suite.chainId, {
        threshold: {
          absolute_percentage: { percentage: { majority: {} } },
        },
        // 1 hour
        maxVotingPeriod: { time: 60 * 60 },
        allowRevoting: false,
        submissionPolicy: 'members',
      })

    const instantiateInfo = CwDao.generateInstantiateInfo(
      suite.chainId,
      {
        name: 'test name',
        description: 'test description',
      },
      votingModuleInfo,
      [proposalModuleSingleInfo]
    )

    const adminFactory = new CwAdminFactoryClient(
      await signers[0].getSigningClient(),
      signers[0].address,
      chainConfig.factoryContractAddress
    )

    const { events } = await adminFactory.instantiateContractWithSelfAdmin(
      {
        codeId: instantiateInfo.codeId,
        instantiateMsg: instantiateInfo.msg,
        label: instantiateInfo.label,
      },
      CHAIN_GAS_MULTIPLIER,
      undefined,
      instantiateInfo.funds
    )

    const coreAddress = findWasmAttributeValue(
      suite.chainId,
      events,
      chainConfig.factoryContractAddress,
      'set contract admin as itself'
    )!

    expect(coreAddress).toBeDefined()

    const dao = new CwDao(suite.queryClient, {
      chainId: suite.chainId,
      coreAddress,
    })
    await dao.init()

    const votingModule = dao.votingModule as TokenStakedVotingModule
    const proposalModule = dao.proposalModules[0] as SingleChoiceProposalModule

    expect(dao.coreAddress).toBe(coreAddress)
    expect(dao.name).toBe('test name')
    expect(dao.description).toBe('test description')
    expect(dao.info.coreVersion).toBe(suite.contractVersion)

    expect(votingModule.address).toBeDefined()
    expect(votingModule.contractName).toBe(ContractName.DaoVotingTokenStaked)

    expect(dao.proposalModules.length).toBe(1)
    expect(proposalModule.address).toBeDefined()
    expect(proposalModule.contractName).toBe(ContractName.DaoProposalSingle)

    const govToken = await suite.queryClient.fetchQuery(
      votingModule.getGovernanceTokenQuery()
    )
    expect(govToken.symbol).toBe('TEST')
    expect(govToken.decimals).toBe(6)

    const supply = await suite.queryClient.fetchQuery(
      chainQueries.supply({
        chainId: suite.chainId,
        denom: govToken.denomOrAddress,
      })
    )
    expect(supply).toBe(totalSupply.toString())

    let totalVotingPower = (
      await suite.queryClient.fetchQuery(
        votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe('0')

    // Stake 50 tokens for each signer.
    await Promise.all(
      signers.map((signer) =>
        suite.stakeNativeTokens(
          votingModule.address,
          signer,
          50,
          govToken.denomOrAddress
        )
      )
    )

    // Wait a block to ensure the staking is complete.
    await suite.waitOneBlock()

    totalVotingPower = (
      await suite.queryClient.fetchQuery(
        votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe((50 * signers.length).toString())

    // Create delegations contract.
    const hookCaller = await votingModule.getHookCaller()
    const delegationAddress = await instantiateSmartContract(
      signers[0].getSigningClient,
      signers[0].address,
      chainConfig.codeIds.DaoVoteDelegation,
      `DAO DAO Vote Delegation (${Date.now()})`,
      {
        dao: dao.coreAddress,
        // 90 days assuming 3 seconds per block.
        delegation_validity_blocks: (90 * 24 * 3600) / 3,
        no_sync_proposal_modules: false,
        // a delegate can only utilize at most 10% of total voting power, even
        // if they are delegated more.
        vp_cap_percent: '0.1',
        vp_hook_callers: [hookCaller],
      },
      undefined,
      dao.coreAddress
    )

    // Propose to set up delegations.
    const manageWidgetsAction = new ManageWidgetsAction({
      t: (key) => key,
      chain: suite.chain,
      chainContext: {
        type: ActionChainContextType.Supported,
        chainId: suite.chainId,
        chain: suite.chain,
        config: chainConfig,
      },
      address: signers[0].address,
      context: {
        type: ActionContextType.Dao,
        dao,
        accounts: [...dao.accounts],
      },
      queryClient: suite.queryClient,
    })
    await manageWidgetsAction.init()
    const msgs = await manageWidgetsAction.encode({
      mode: 'set',
      id: WidgetId.VoteDelegation,
      values: {
        address: delegationAddress,
      },
    })

    await suite.createAndExecuteSingleChoiceProposal(
      dao,
      signers[0],
      signers,
      'Set up delegations',
      msgs
    )

    const delegateSigners = signers.slice(0, 10)
    const delegatorSigners = signers.slice(10)

    // Register first 10 signers as delegates.

    await Promise.all(
      delegateSigners.map((signer) =>
        suite.registerAsDelegate(delegationAddress, signer)
      )
    )

    // Wait a block to ensure the delegations are registered.
    await suite.waitOneBlock()

    // Check that the delegations are registered.
    let { delegates } = await suite.queryClient.fetchQuery(
      daoVoteDelegationQueries.delegates(suite.queryClient, {
        chainId: suite.chainId,
        contractAddress: delegationAddress,
        args: {
          limit: 10,
        },
      })
    )

    expect(delegates.length).toBe(10)
    expect(
      delegateSigners.every((signer) =>
        delegates.some((delegate) => delegate.delegate === signer.address)
      )
    ).toBe(true)

    // Delegate voting power to delegates based on the index. In each set of 10
    // delegates, the first delegates 100% of their voting power to the first
    // delegate, the second delegates 50% of their voting power to the first two
    // delegates, the third delegates 33% of their voting power to the first
    // three delegates, and so on.
    await Promise.all(
      delegatorSigners.map(async (delegator, index) => {
        const numDelegates = (index % delegates.length) + 1
        const percent = (Math.floor(100 / numDelegates) / 100).toString()

        for (const { delegate } of delegates.slice(0, numDelegates)) {
          await suite.delegate(delegationAddress, delegator, delegate, percent)
        }
      })
    )

    // Wait a block to ensure the delegations are registered.
    await suite.waitOneBlock()

    // Check that the voting power is distributed correctly.
    delegates = (
      await suite.queryClient.fetchQuery(
        daoVoteDelegationQueries.delegates(suite.queryClient, {
          chainId: suite.chainId,
          contractAddress: delegationAddress,
          args: {
            limit: 10,
          },
        })
      )
    ).delegates

    // Each delegator divides their voting power evenly among their delegates,
    // and floors the result.

    expect(delegates.length).toBe(10)
    // 90 / 10 * floor((floor(100 / 10) / 100) * 50) = 45
    expect(delegates[9].power).toBe('45')
    // 45 + 90 / 10 * floor((floor(100 / 9) / 100) * 50) = 90
    expect(delegates[8].power).toBe('90')
    // 90 + 90 / 10 * floor((floor(100 / 8) / 100) * 50) = 144
    expect(delegates[7].power).toBe('144')
    // 144 + 90 / 10 * floor((floor(100 / 7) / 100) * 50) = 207
    expect(delegates[6].power).toBe('207')
    // 207 + 90 / 10 * floor((floor(100 / 6) / 100) * 50) = 279
    expect(delegates[5].power).toBe('279')
    // 279 + 90 / 10 * floor((floor(100 / 5) / 100) * 50) = 369
    expect(delegates[4].power).toBe('369')
    // 369 + 90 / 10 * floor((floor(100 / 4) / 100) * 50) = 477
    expect(delegates[3].power).toBe('477')
    // 477 + 90 / 10 * floor((floor(100 / 3) / 100) * 50) = 621
    expect(delegates[2].power).toBe('621')
    // 621 + 90 / 10 * floor((floor(100 / 2) / 100) * 50) = 846
    expect(delegates[1].power).toBe('846')
    // 846 + 90 / 10 * floor((floor(100 / 1) / 100) * 50) = 1296
    expect(delegates[0].power).toBe('1296')
  })
})
