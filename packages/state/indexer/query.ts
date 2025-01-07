import {
  IndexerFormulaType,
  IndexerUpStatus,
  WithChainId,
} from '@dao-dao/types'
import { CommonError, INDEXER_URL, chainIsIndexed } from '@dao-dao/utils'

export type QueryIndexerOptions = WithChainId<
  {
    formula: string
    args?: Record<string, any>
    block?: {
      height: number | string
      // Most formulas do not need the time, so make it optional.
      timeUnixMs?: number | string
    }
    times?: {
      startUnixMs: number
      endUnixMs?: number
      stepMs?: number
    }
  } & (
    | {
        type: `${IndexerFormulaType.Generic}`
        address?: never
      }
    | {
        type: `${Exclude<IndexerFormulaType, IndexerFormulaType.Generic>}`
        address: string
      }
  )
>

export const queryIndexer = async <T = any>({
  type,
  address = '_',
  formula,
  args,
  block,
  times,
  chainId,
}: QueryIndexerOptions): Promise<T | undefined> => {
  if (!chainIsIndexed(chainId)) {
    throw new Error(CommonError.NoIndexerForChain)
  }

  // Filter out undefined args.
  if (args) {
    args = Object.entries(args).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, any>
    )
  }

  const params = new URLSearchParams({
    ...args,
    ...(block && {
      block: `${block.height}:${block.timeUnixMs ?? 1}`,
    }),
    ...(times && {
      times: `${BigInt(times.startUnixMs).toString()}..${
        times.endUnixMs ? BigInt(times.endUnixMs).toString() : ''
      }`,
      ...(times.stepMs && {
        timeStep: times.stepMs.toString(),
      }),
    }),
  })

  const path = `/${chainId}/${type}/${address}/${formula}?${params.toString()}`
  const response = await fetch(INDEXER_URL + path, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const body = await response.text()

  if (response.status >= 300) {
    throw new Error(
      `Error querying indexer for ${path}: ${response.status} ${body}`.trim()
    )
  }

  if (response.status === 204) {
    // If no content is returned, return undefined. This will happen if the
    // formula computed succesfully and outputted nothing (undefined or null).
    return undefined
  }

  return JSON.parse(body)
}

export const queryIndexerUpStatus = async ({
  chainId,
}: WithChainId<{}>): Promise<IndexerUpStatus> => {
  if (!chainIsIndexed(chainId)) {
    throw new Error(CommonError.NoIndexerForChain)
  }

  const upResponse = await fetch([INDEXER_URL, chainId, 'up'].join('/'))

  let upStatus: IndexerUpStatus
  if (upResponse.status === 200 || upResponse.status === 412) {
    upStatus = await upResponse.json()
  } else {
    throw new Error(`Error querying indexer up status: ${upResponse.status}`)
  }

  return upStatus
}
