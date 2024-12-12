import { coins } from '@cosmjs/proto-signing'
import { describe, expect, it } from 'vitest'

import { chainQueries } from '@dao-dao/state'
import {
  Cw4VotingModule,
  CwDao,
  SingleChoiceProposalModule,
  TokenStakedVotingModule,
} from '@dao-dao/state/clients'
import { CwAdminFactoryClient } from '@dao-dao/state/contracts/CwAdminFactory'
import {
  CHAIN_GAS_MULTIPLIER,
  ContractName,
  executeSmartContract,
  findWasmAttributeValue,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { suite } from './common'

describe('simple', () => {
  it('should create a member-based DAO', async () => {
    const { factoryContractAddress } = mustGetSupportedChainConfig(
      suite.chainId
    )

    const { address, signingClient } = await suite.makeSigner()

    const votingModuleInfo = Cw4VotingModule.generateModuleInstantiateInfo(
      suite.chainId,
      {
        new: {
          members: [
            {
              addr: address,
              weight: 1,
            },
          ],
        },
      }
    )

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
      signingClient,
      address,
      factoryContractAddress
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
      factoryContractAddress,
      'set contract admin as itself'
    )!

    expect(coreAddress).toBeDefined()

    const dao = new CwDao(suite.queryClient, {
      chainId: suite.chainId,
      coreAddress,
    })
    await dao.init()

    expect(dao.coreAddress).toBe(coreAddress)
    expect(dao.name).toBe('test name')
    expect(dao.description).toBe('test description')
    expect(dao.info.coreVersion).toBe(suite.contractVersion)

    expect(dao.votingModule.address).toBeDefined()
    expect(dao.votingModule.contractName).toBe(ContractName.DaoVotingCw4)

    expect(dao.proposalModules.length).toBe(1)
    expect(dao.proposalModules[0].address).toBeDefined()
    expect(dao.proposalModules[0].contractName).toBe(
      ContractName.DaoProposalSingle
    )

    const totalVotingPower = (
      await suite.queryClient.fetchQuery(
        dao.votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe('1')
  })

  it('should create a token-based DAO', async () => {
    const { factoryContractAddress } = mustGetSupportedChainConfig(
      suite.chainId
    )

    const signers = await suite.makeSigners(5)

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
      factoryContractAddress
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
      factoryContractAddress,
      'set contract admin as itself'
    )!

    expect(coreAddress).toBeDefined()

    const dao = new CwDao(suite.queryClient, {
      chainId: suite.chainId,
      coreAddress,
    })
    await dao.init()

    const votingModule = dao.votingModule as TokenStakedVotingModule

    expect(dao.coreAddress).toBe(coreAddress)
    expect(dao.name).toBe('test name')
    expect(dao.description).toBe('test description')
    expect(dao.info.coreVersion).toBe(suite.contractVersion)

    expect(dao.votingModule.address).toBeDefined()
    expect(dao.votingModule.contractName).toBe(
      ContractName.DaoVotingTokenStaked
    )

    expect(dao.proposalModules.length).toBe(1)
    expect(dao.proposalModules[0].address).toBeDefined()
    expect(dao.proposalModules[0].contractName).toBe(
      ContractName.DaoProposalSingle
    )

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
        dao.votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe('0')

    // Stake 50 tokens for each signer.
    await Promise.all(
      signers.map(({ address, signingClient }) =>
        executeSmartContract(
          signingClient,
          address,
          dao.votingModule.address,
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
        dao.votingModule.getTotalVotingPowerQuery()
      )
    ).power
    expect(totalVotingPower).toBe((50 * signers.length).toString())
  })
})
