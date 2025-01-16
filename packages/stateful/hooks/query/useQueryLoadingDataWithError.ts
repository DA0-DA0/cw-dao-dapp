import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useUpdatingRef } from '@dao-dao/stateless'
import { LoadingDataWithError } from '@dao-dao/types'

/**
 * Transform react-query results into our LoadingDataWithError abstraction that
 * components use.
 */
export const useQueryLoadingDataWithError = <
  TQueryFnData extends unknown,
  TTransformedData extends unknown = TQueryFnData,
>(
  /**
   * Query options to passthrough to useQuery.
   */
  options?: Omit<
    Parameters<typeof useQuery<TQueryFnData, Error, TQueryFnData, any>>[0],
    'select'
  >,
  /**
   * Optional function to transform the data.
   */
  transform?: (data: TQueryFnData) => TTransformedData
): LoadingDataWithError<TTransformedData> => {
  const { isPending, isError, isRefetching, data, error } = useQuery(
    // Loading state if options undefined.
    options || {
      queryKey: [] as any,
      queryFn: skipToken,
    }
  )
  const transformRef = useUpdatingRef(transform)

  return useMemo((): LoadingDataWithError<TTransformedData> => {
    if (isPending) {
      return {
        loading: true,
        errored: false,
      }
    } else if (isError) {
      return {
        loading: false,
        errored: true,
        error,
      }
    } else {
      try {
        return {
          loading: false,
          errored: false,
          updating: isRefetching,
          data: transformRef.current
            ? transformRef.current(data)
            : (data as unknown as TTransformedData),
        }

        // Catch errors in `transform` function.
      } catch (err) {
        return {
          loading: false,
          errored: true,
          error: err instanceof Error ? err : new Error(`${err}`),
        }
      }
    }
  }, [isPending, isError, isRefetching, data, error, transformRef])
}
