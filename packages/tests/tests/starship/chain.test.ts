import { suite } from './common'

describe('chain', () => {
  it('should validate the chain is making blocks', async () => {
    const height = await suite.client.getHeight()
    expect(height).toBeGreaterThan(0)
  })
})
