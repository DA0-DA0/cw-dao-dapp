import { ContractVersion } from '@dao-dao/types'

import { StarshipSuite } from './suite'

export let suite: StarshipSuite

beforeAll(async () => {
  suite = await StarshipSuite.init('juno')

  suite.registerSupportedChain({
    version: ContractVersion.V270Alpha1,
    factoryContractAddress:
      'juno18cszlvm6pze0x9sz32qnjq4vtd45xehqs8dq7cwy8yhq35wfnn3qaqnqsq',
  })
})

describe('setup', () => {
  it('should validate the chain is making blocks', async () => {
    const height = await suite.client.getHeight()
    expect(height).toBeGreaterThan(0)
  })
})
