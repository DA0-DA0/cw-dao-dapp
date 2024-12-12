import { coins } from '@cosmjs/proto-signing'
import { describe, expect, it } from 'vitest'

import { chainQueries } from '@dao-dao/state'
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
  executeSmartContract,
  findWasmAttributeValue,
  instantiateSmartContract,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { suite } from './common'

describe('delegations', () => {
  it('should create a token-based DAO with delegations', async () => {
    const chainConfig = mustGetSupportedChainConfig(suite.chainId)

    const signers = await suite.makeSigners(10)

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
      signers[0].signingClient,
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
      signers.map(({ address, signingClient }) =>
        executeSmartContract(
          signingClient,
          address,
          votingModule.address,
          {
            stake: {},
          },
          coins(50, govToken.denomOrAddress)
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
      signers[0].signingClient,
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
  })
})
