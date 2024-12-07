import { ContractVersion } from '@dao-dao/types'

import { StarshipSuite } from './suite'

export let suite: StarshipSuite

beforeAll(async () => {
  suite = await StarshipSuite.init('juno', ContractVersion.V270Alpha1)
  await suite.ensureChainSetUp()
})

describe('setup', () => {
  it('should validate the chain is making blocks', async () => {
    const height = await suite.client.getHeight()
    expect(height).toBeGreaterThan(0)
  })
})
