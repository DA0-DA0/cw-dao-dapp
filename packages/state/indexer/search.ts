import MeiliSearch from 'meilisearch'

import { SEARCH_API_KEY, SEARCH_DAOS_INDEX, SEARCH_HOST } from '@dao-dao/utils'

let _client: MeiliSearch | undefined

const loadClient = async (): Promise<MeiliSearch> => {
  if (!_client) {
    _client = new MeiliSearch({
      host: SEARCH_HOST,
      apiKey: SEARCH_API_KEY,
    })
  }

  return _client
}

export interface DaoSearchResult {
  contractAddress: string
  codeId: number
  blockHeight: number
  blockTimeUnixMicro: number
  value: {
    name: string
    description: string
    image_url: string | null
  }
}

export const searchDaos = async (
  query: string,
  limit?: number,
  exclude?: string[]
) => {
  const client = await loadClient()
  const index = client.index(SEARCH_DAOS_INDEX)

  const results = await index.search<DaoSearchResult>(query, {
    limit,
    filter: exclude?.length
      ? `NOT contractAddress IN ["${exclude.join('", "')}"]`
      : undefined,
    // Most recent at the top.
    sort: ['blockHeight:desc'],
  })

  return results.hits
}
