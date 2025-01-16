import { beforeAll } from 'vitest'

import { ContractVersion } from '@dao-dao/types'

import { StarshipSuite } from './suite'

export let suite: StarshipSuite

beforeAll(async () => {
  suite = await StarshipSuite.init('neutron', ContractVersion.V270Alpha2)
  await suite.ensureChainSetUp()
})
