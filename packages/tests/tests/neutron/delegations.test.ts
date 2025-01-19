import { coins } from '@cosmjs/proto-signing'
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
  ProposalStatusEnum,
  WidgetId,
} from '@dao-dao/types'
import { MsgSend } from '@dao-dao/types/protobuf/codegen/cosmos/bank/v1beta1/tx'
import {
  CHAIN_GAS_MULTIPLIER,
  ContractName,
  batch,
  findWasmAttributeValue,
  instantiateSmartContract,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { suite } from './common'

describe('delegations', () => {
  it.only('should create a token-based DAO with delegations', async () => {
    const chainConfig = mustGetSupportedChainConfig(suite.chainId)

    const creator = await suite.makeSigner()
    const creatorSigningClient = await creator.getSigningClient()

    const members = await suite.makeSigners(100)

    // Ensure creator has enough funds to create the DAO.
    await creator.ensureHasTokens(100_000)

    const totalSupply = 1_000_000
    const initialBalance = 100
    const initialDaoBalance = totalSupply - initialBalance * members.length

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
            initialBalances: [
              {
                address: creator.address,
                amount: BigInt(members.length * initialBalance).toString(),
              },
            ],
            initialDaoBalance: initialDaoBalance.toString(),
            funds: factoryTokenDenomCreationFee,
          },
        },
      })

    const proposalModuleSingleInfo =
      SingleChoiceProposalModule.generateModuleInstantiateInfo(suite.chainId, {
        threshold: {
          absolute_percentage: {
            percentage: {
              majority: {},
            },
          },
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
      creatorSigningClient,
      creator.address,
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

    // Send tokens to each member in batches of 100.
    await batch({
      list: members,
      batchSize: 100,
      grouped: true,
      task: (recipients) =>
        creatorSigningClient.signAndBroadcast(
          creator.address,
          recipients.map(({ address }) => ({
            typeUrl: MsgSend.typeUrl,
            value: MsgSend.fromPartial({
              fromAddress: creator.address,
              toAddress: address,
              amount: coins(initialBalance, govToken.denomOrAddress),
            }),
          })),
          CHAIN_GAS_MULTIPLIER
        ),
      tries: 3,
      delayMs: 1_000,
    })

    // Stake 50 tokens for each member.
    await Promise.all(
      members.map((member) =>
        suite.stakeNativeTokens(
          votingModule.address,
          member,
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
    expect(totalVotingPower).toBe((50 * members.length).toString())

    // Create delegations contract.
    const hookCaller = await votingModule.getHookCaller()
    // a delegate can only utilize at most 10% of total voting power, even if
    // they are delegated more.
    const vpCapPercent = 0.1
    const delegationAddress = await instantiateSmartContract(
      creatorSigningClient,
      creator.address,
      chainConfig.codeIds.DaoVoteDelegation,
      `DAO DAO Vote Delegation (${Date.now()})`,
      {
        dao: dao.coreAddress,
        // 90 days assuming 3 seconds per block.
        delegation_validity_blocks: (90 * 24 * 3600) / 3,
        no_sync_proposal_modules: false,
        vp_cap_percent: vpCapPercent.toString(),
        vp_hook_callers: [hookCaller],
      },
      undefined,
      dao.coreAddress
    )

    const delegatedVpCap = Math.floor(Number(totalVotingPower) * vpCapPercent)

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
      address: dao.coreAddress,
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
      members[0],
      members,
      'Set up delegations',
      msgs
    )

    // Register first 10 members as delegates.
    const delegateMembers = members.slice(0, 10)
    const delegatorMembers = members.slice(10)

    await Promise.all(
      delegateMembers.map((member) =>
        suite.registerAsDelegate(delegationAddress, member)
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
      delegateMembers.every((member) =>
        delegates.some((delegate) => delegate.delegate === member.address)
      )
    ).toBe(true)

    // Delegate voting power to delegates based on the index. In each set of 10
    // delegates, the first delegates 100% of their voting power to the first
    // delegate, the second delegates 50% of their voting power to the first two
    // delegates, the third delegates 33% of their voting power to the first
    // three delegates, and so on.
    await Promise.all(
      delegatorMembers.map(async (delegator, index) => {
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

    // Create a proposal.
    const { proposalNumber } = await suite.createSingleChoiceProposal(
      dao,
      members[0],
      'Test proposal'
    )

    // Vote on the proposal by all the delegates, which together carry enough
    // voting power to pass the proposal. It should *not* pass early, since
    // their delegators can still override their delegates' votes and change the
    // outcome. Thus, it should still be open.
    let proposal = await suite.voteOnSingleChoiceProposal(
      proposalModule,
      proposalNumber,
      delegateMembers,
      'yes'
    )

    expect(proposal.status).toBe(ProposalStatusEnum.Open)
    const delegatesYesVp =
      // Personal VP of all delegates: 50 * 10 = 500
      50 * delegateMembers.length +
      // Delegated VP of all delegates, each capped at 10% of total VP.
      [1296, 846, 621, 477, 369, 279, 207, 144, 90, 45].reduce(
        (acc, curr) => acc + Math.min(curr, delegatedVpCap),
        0
      )
    expect(proposal.votes.yes).toBe(BigInt(delegatesYesVp).toString())
    expect(proposal.individual_votes.yes).toBe(
      BigInt(50 * delegateMembers.length).toString()
    )

    // Vote no with 51 delegators to definitively reject the proposal,
    // overriding their delegates' votes.
    proposal = await suite.voteOnSingleChoiceProposal(
      proposalModule,
      proposalNumber,
      delegatorMembers.slice(0, 51),
      'no'
    )

    expect(proposal.status).toBe(ProposalStatusEnum.Rejected)
    // Partial yes votes from delegates were overridden by their delegators.
    expect(Number(proposal.votes.yes)).toBeLessThan(delegatesYesVp)
    // 51 delegators voted no.
    expect(proposal.votes.no).toBe(BigInt(50 * 51).toString())
    // Just delegates voted yes.
    expect(proposal.individual_votes.yes).toBe(
      BigInt(50 * delegateMembers.length).toString()
    )
    // 51 delegators voted no.
    expect(proposal.individual_votes.no).toBe(BigInt(50 * 51).toString())
  })

  it('should create a large token-based DAO with delegations and test gas limits', async () => {
    const chainConfig = mustGetSupportedChainConfig(suite.chainId)

    const creator = await suite.makeSigner()
    const creatorSigningClient = await creator.getSigningClient()

    const members = await suite.makeSigners(1_000)

    // Ensure creator has enough funds to create the DAO.
    await creator.ensureHasTokens(100_000)

    // How much to give to each member.
    const initialBalance = 2_000

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
            initialBalances: [
              {
                address: creator.address,
                amount: BigInt(members.length * initialBalance).toString(),
              },
            ],
            funds: factoryTokenDenomCreationFee,
          },
        },
      })

    const proposalModuleSingleInfo =
      SingleChoiceProposalModule.generateModuleInstantiateInfo(suite.chainId, {
        // Make any single vote pass.
        threshold: {
          absolute_count: { threshold: '1' },
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
      creatorSigningClient,
      creator.address,
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
    expect(supply).toBe(BigInt(members.length * initialBalance).toString())

    let totalVotingPower = (
      await suite.queryClient.fetchQuery(
        votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe('0')

    // Send tokens to each member in batches of 200.
    await batch({
      list: members,
      batchSize: 200,
      grouped: true,
      task: (recipients) =>
        creatorSigningClient.signAndBroadcast(
          creator.address,
          recipients.map(({ address }) => ({
            typeUrl: MsgSend.typeUrl,
            value: MsgSend.fromPartial({
              fromAddress: creator.address,
              toAddress: address,
              amount: coins(initialBalance, govToken.denomOrAddress),
            }),
          })),
          CHAIN_GAS_MULTIPLIER
        ),
      tries: 3,
      delayMs: 1_000,
    })

    // Stake half tokens for each member in batches of 100.
    const initialStaked = initialBalance / 2
    const remainingUnstaked = initialBalance - initialStaked
    await batch({
      list: members,
      batchSize: 100,
      task: (member) =>
        suite.stakeNativeTokens(
          votingModule.address,
          member,
          initialStaked,
          govToken.denomOrAddress
        ),
      tries: 3,
      delayMs: 1_000,
    })

    // Wait a block to ensure the staking is complete.
    await suite.waitOneBlock()

    totalVotingPower = (
      await suite.queryClient.fetchQuery(
        votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe((initialStaked * members.length).toString())

    // Create delegations contract.
    const hookCaller = await votingModule.getHookCaller()
    const delegationAddress = await instantiateSmartContract(
      creator.getSigningClient,
      creator.address,
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
      address: dao.coreAddress,
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
      members[0],
      // Only need one voter to pass the proposal.
      members.slice(0, 1),
      'Set up delegations',
      msgs
    )

    // Register first 65 members as delegates.
    const numDelegates = 65
    const delegateMembers = members.slice(0, numDelegates)
    const delegatorMembers = members.slice(numDelegates)
    const delegator = delegatorMembers[0]

    // Register delegates in batches of 100.
    await batch({
      list: delegateMembers,
      batchSize: 100,
      task: (member) => suite.registerAsDelegate(delegationAddress, member),
      tries: 3,
      delayMs: 1_000,
    })

    // Wait a block to ensure the delegations are registered.
    await suite.waitOneBlock()

    // Check that the delegations are registered.
    let { delegates } = await suite.queryClient.fetchQuery(
      daoVoteDelegationQueries.delegates(suite.queryClient, {
        chainId: suite.chainId,
        contractAddress: delegationAddress,
        args: {
          limit: 40,
        },
      })
    )

    expect(delegates.length).toBe(40)
    expect(
      delegates.every(({ delegate }) =>
        delegateMembers.some((member) => member.address === delegate)
      )
    ).toBe(true)
    expect(delegates).toEqual(
      delegates.map((d) => ({
        ...d,
        power: '0',
      }))
    )

    // TEST 1: Update voting power for a delegator, which loops through all
    // delegates and updates their delegated voting power. This should cause a
    // gas error if there are too many delegates to update.

    // Delegate to each of the delegates in batches of 25. Round to 5 decimal
    // places to avoid infinitely repeating decimals.
    const percentDelegated = Math.floor(100_000 / numDelegates / 3) / 100_000
    const delegatorSigningClient = await delegator.getSigningClient()
    await batch({
      list: delegateMembers,
      batchSize: 25,
      grouped: true,
      task: (delegates) =>
        delegatorSigningClient
          .executeMultiple(
            delegator.address,
            delegates.map(({ address }) => ({
              contractAddress: delegationAddress,
              msg: {
                delegate: {
                  delegate: address,
                  percent: percentDelegated.toString(),
                },
              },
            })),
            CHAIN_GAS_MULTIPLIER
          )
          .then(() => suite.waitOneBlock()),
      tries: 3,
      delayMs: 1_000,
    })

    // Wait a block to ensure the delegations are registered.
    await suite.waitOneBlock()

    // Check that the voting power is distributed correctly.
    delegates = (
      await suite.queryClient.fetchQuery(
        daoVoteDelegationQueries.delegates(suite.queryClient, {
          chainId: suite.chainId,
          contractAddress: delegationAddress,
          args: {
            limit: 30,
          },
        })
      )
    ).delegates

    expect(delegates.length).toBe(30)
    expect(delegates).toEqual(
      delegates.map((d) => ({
        ...d,
        power: BigInt(Math.floor(initialStaked * percentDelegated)).toString(),
      }))
    )

    // Stake the other half of the tokens, which should update all delegations.
    await suite.stakeNativeTokens(
      votingModule.address,
      delegator,
      remainingUnstaked,
      govToken.denomOrAddress
    )

    // Wait a block to ensure the staking is complete.
    await suite.waitOneBlock()

    // Check that the voting power is updated correctly.
    delegates = (
      await suite.queryClient.fetchQuery(
        daoVoteDelegationQueries.delegates(suite.queryClient, {
          chainId: suite.chainId,
          contractAddress: delegationAddress,
          args: {
            limit: 35,
          },
        })
      )
    ).delegates

    expect(delegates.length).toBe(35)
    expect(delegates).toEqual(
      delegates.map((d) => ({
        ...d,
        power: BigInt(Math.floor(initialBalance * percentDelegated)).toString(),
      }))
    )

    // Undo the half stake so that all members are equal again.
    await suite.unstakeNativeTokens(
      votingModule.address,
      delegator,
      remainingUnstaked
    )

    // Wait a block to ensure the staking is complete.
    await suite.waitOneBlock()

    // TEST 2: Override all delegates' votes, which loops through all delegates
    // and updates both their ballots and unvoted delegated voting power on that
    // proposal. This should cause a gas error if there are too many delegates
    // to update.

    let { proposalNumber, proposal } = await suite.createSingleChoiceProposal(
      dao,
      members[0],
      'Test'
    )

    // Get the unvoted delegated voting power for each delegate from the
    // previous list query.
    let unvotedDelegateVotingPowers = await Promise.all(
      delegates.map(async ({ delegate }) => {
        const { effective, total } = await suite.queryClient.fetchQuery(
          daoVoteDelegationQueries.unvotedDelegatedVotingPower(
            suite.queryClient,
            {
              chainId: suite.chainId,
              contractAddress: delegationAddress,
              args: {
                delegate,
                height: proposal.start_height,
                proposalModule: proposalModule.address,
                proposalId: proposalNumber,
              },
            }
          )
        )

        return {
          effective,
          total,
        }
      })
    )

    // Verify that the unvoted delegated voting power is equal to the total
    // delegated voting power, since the delegator has not voted yet.
    expect(unvotedDelegateVotingPowers).toEqual(
      delegates.map(() => ({
        effective: BigInt(
          Math.floor(initialStaked * percentDelegated)
        ).toString(),
        total: BigInt(Math.floor(initialStaked * percentDelegated)).toString(),
      }))
    )

    // All delegates vote on the proposal in batches of 100.
    await batch({
      list: delegateMembers,
      batchSize: 100,
      task: (delegate) =>
        proposalModule.vote({
          proposalId: proposalNumber,
          signingClient: delegate.getSigningClient,
          sender: delegate.address,
          vote: 'yes',
        }),
      tries: 3,
      delayMs: 1000,
    })

    // Verify votes have been tallied with their personal voting power and the
    // delegated voting power.
    proposal = (
      await proposalModule.getProposal({
        proposalId: proposalNumber,
      })
    ).proposal
    expect(proposal.votes.yes).toBe(
      BigInt(
        (initialStaked + Math.floor(initialStaked * percentDelegated)) *
          numDelegates
      ).toString()
    )

    // Delegator overrides all delegates' votes, which should update all the
    // delegate's ballots and unvoted delegated voting power.
    await proposalModule.vote({
      proposalId: proposalNumber,
      signingClient: delegator.getSigningClient,
      sender: delegator.address,
      vote: 'no',
    })

    // Verify vote tallies have been updated with the delegator's vote, removing
    // the delegator's delegated voting power from the delegates' yes votes and
    // adding the delegator's full voting power to the no votes.
    proposal = (
      await proposalModule.getProposal({
        proposalId: proposalNumber,
      })
    ).proposal
    expect(proposal.votes.yes).toBe(
      BigInt(initialStaked * numDelegates).toString()
    )
    expect(proposal.votes.no).toBe(BigInt(initialStaked).toString())

    // Get the unvoted delegated voting power for each delegate from the
    // previous list query, after the delegator has voted.
    unvotedDelegateVotingPowers = await Promise.all(
      delegates.map(async ({ delegate }) => {
        const { effective, total } = await suite.queryClient.fetchQuery(
          daoVoteDelegationQueries.unvotedDelegatedVotingPower(
            suite.queryClient,
            {
              chainId: suite.chainId,
              contractAddress: delegationAddress,
              args: {
                delegate,
                height: proposal.start_height,
                proposalModule: proposalModule.address,
                proposalId: proposalNumber,
              },
            }
          )
        )

        return {
          effective,
          total,
        }
      })
    )

    // Verify that the unvoted delegated voting power is now 0, since the
    // delegator voted.
    expect(unvotedDelegateVotingPowers).toEqual(
      delegates.map(() => ({
        effective: '0',
        total: '0',
      }))
    )
  })
})
