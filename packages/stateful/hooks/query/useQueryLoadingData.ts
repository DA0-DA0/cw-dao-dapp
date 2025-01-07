import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import { useUpdatingRef } from '@dao-dao/stateless'
import { LoadingData } from '@dao-dao/types'

/**
 * Transform react-query results into our LoadingData object that components
 * use.
 */
export const useQueryLoadingData = <
  TQueryFnData extends unknown,
  TTransformedData extends unknown = TQueryFnData,
>(
  /**
   * Query options to passthrough to useQuery.
   */
  options:
    | Omit<
        Parameters<typeof useQuery<TQueryFnData, Error, TQueryFnData, any>>[0],
        'select'
      >
    | undefined,
  /**
   * Default value in case of an error.
   */
  defaultValue: TTransformedData,
  extra?: {
    /**
     * Optionally call a function on error.
     */
    onError?: (error: Error) => void
    /**
     * Optional function to transform the data.
     */
    transform?: (data: TQueryFnData) => TTransformedData
  }
): LoadingData<TTransformedData> => {
  const { isPending, isError, isRefetching, data, error } = useQuery(
    // Loading state if options undefined.
    options || {
      queryKey: [] as any,
      queryFn: skipToken,
    }
  )

  const onErrorRef = useUpdatingRef(extra?.onError)
  const transformRef = useUpdatingRef(extra?.transform)

  // Use deep compare to prevent memoize on every re-render if an object is
  // passed as the default value.
  const memoizedDefaultValue = useDeepCompareMemoize(defaultValue)

  return useMemo((): LoadingData<TTransformedData> => {
    if (isPending) {
      return {
        loading: true,
      }
    } else if (isError) {
      onErrorRef.current?.(error)
      return {
        loading: false,
        data: memoizedDefaultValue,
      }
    } else {
      try {
        return {
          loading: false,
          updating: isRefetching,
          data: transformRef.current
            ? transformRef.current(data)
            : (data as unknown as TTransformedData),
        }

        // Catch errors in `transform` function.
      } catch (err) {
        onErrorRef.current?.(err instanceof Error ? err : new Error(`${err}`))
        return {
          loading: false,
          data: memoizedDefaultValue,
        }
      }
    }
  }, [
    isPending,
    isError,
    onErrorRef,
    error,
    memoizedDefaultValue,
    isRefetching,
    transformRef,
    data,
  ])
}
