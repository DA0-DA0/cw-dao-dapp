import {
  Cw4VotingModule,
  CwDao,
  SingleChoiceProposalModule,
} from '@dao-dao/state/clients'
import { CwAdminFactoryClient } from '@dao-dao/state/contracts/CwAdminFactory'
import {
  CHAIN_GAS_MULTIPLIER,
  encodeJsonToBase64,
  findWasmAttributeValue,
  mustGetSupportedChainConfig,
} from '@dao-dao/utils'

import { suite } from './setup.test'

describe('delegations', () => {
  it('should work', async () => {
    const { factoryContractAddress, codeIds } = mustGetSupportedChainConfig(
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

    const instantiateMsg = CwDao.generateInstantiateInfo(
      suite.chainId,
      {
        name: 'test',
        description: 'test',
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
        codeId: codeIds.DaoDaoCore,
        instantiateMsg: encodeJsonToBase64(instantiateMsg),
        label: 'test',
      },
      CHAIN_GAS_MULTIPLIER
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

    console.log(dao)
    console.log(JSON.stringify(dao, null, 2))
  })
})
