import {
  PageRequest,
  PageResponse,
} from '@dao-dao/types/protobuf/codegen/cosmos/base/query/v1beta1/pagination'

export const getAllRpcResponse = async <
  P extends { pagination?: PageRequest; [key: string]: any },
  R extends { pagination?: PageResponse; [key: string]: any },
  K extends keyof R,
  V = R[K] extends any[] ? R[K] : R[K][],
>(
  queryFn: (params: P, useInterfaces?: boolean) => Promise<R>,
  params: P,
  key: K,
  reverse = false,
  useInterfaces = false
): Promise<V> => {
  let pagination: Partial<PageRequest> | undefined
  const data = [] as any[]

  do {
    const response = await queryFn(
      {
        ...params,
        pagination: {
          key: new Uint8Array(),
          ...pagination,
          reverse,
          // Get all.
          offset: 0n,
          limit: BigInt(Number.MAX_SAFE_INTEGER),
        },
      },
      useInterfaces
    )

    pagination = response.pagination?.nextKey?.length
      ? {
          key: response.pagination.nextKey,
        }
      : undefined

    const results = response[key] as any

    // If `key` accesses an array, flatten into result data. Otherwise, just
    // concatenate all the responses (in case the paginated array is nested
    // inside `key`).
    if (Array.isArray(results)) {
      // If no results retrieved, stop.
      if (!results?.length) {
        break
      }
      data.push(...results)
    } else {
      data.push(results)
    }
  } while (pagination !== undefined)

  return data as V
}
