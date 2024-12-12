import { beforeAll } from 'vitest'

import { ContractVersion } from '@dao-dao/types'

import { StarshipSuite } from './suite'

export let suite: StarshipSuite

beforeAll(async () => {
  suite = await StarshipSuite.init('juno', ContractVersion.V270Alpha1)
  await suite.ensureChainSetUp()
})
