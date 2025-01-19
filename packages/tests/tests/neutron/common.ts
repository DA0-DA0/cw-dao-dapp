import { beforeAll } from 'vitest'

import { ChainId, ContractVersion } from '@dao-dao/types'

import { TestSuite } from '../suite'

export let suite: TestSuite

beforeAll(async () => {
  suite = await TestSuite.initExisting(
    ChainId.NeutronTestnet,
    ContractVersion.V270Alpha2
  )
  await suite.ensureChainSetUp()
})
