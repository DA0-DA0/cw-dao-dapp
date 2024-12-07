import {
  Cw4VotingModule,
  CwDao,
  SingleChoiceProposalModule,
} from '@dao-dao/state/clients'
import { CwAdminFactoryClient } from '@dao-dao/state/contracts/CwAdminFactory'
import {
  CHAIN_GAS_MULTIPLIER,
  ContractName,
  findWasmAttributeValue,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { suite } from './setup.test'

describe('simple', () => {
  it('should create a DAO', async () => {
    const { factoryContractAddress } = mustGetSupportedChainConfig(
      suite.chainId
    )

    const { address, signingClient } = await suite.makeSigner()

    const votingModule = Cw4VotingModule.generateModuleInstantiateInfo(
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

    const proposalModuleSingle =
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
      votingModule,
      [proposalModuleSingle]
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
  })
})
