import { useEffect, useMemo, useState } from 'react'

import { LoadingDataWithError } from '@dao-dao/types'

import { useUpdatingRef } from './useUpdatingRef'

export type UseLoadingPromiseOptions<T> = {
  /**
   * A function that returns the promise to use. If undefined, will be in
   * loading state. The function will be memoized and thus not reset on every
   * render. Use `deps` if you want the promise to be reloaded when certain
   * dependencies change.
   */
  promise: (() => Promise<T> | undefined) | undefined
  /**
   * Additional dependencies that, if changed, will cause the promise function
   * to be reloaded. The length of this array must never change, since it is
   * spread into a `useMemo` dependency array.
   */
  deps?: any[]
}

/**
 * A hook that wraps a Promise and causes re-renders when it changes, returning
 * a conveniently-typed object.
 */
export const useLoadingPromise = <T>({
  promise: _promise,
  deps,
}: UseLoadingPromiseOptions<T>): LoadingDataWithError<T> => {
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    value: T | null
    error: Error | null
    was: 'success' | 'error' | null
  }>({
    status: 'loading',
    value: null,
    error: null,
    was: null,
  })

  const promiseRef = useUpdatingRef(_promise)
  const promiseIsDefined = !!_promise

  // Load promise when it changes.
  useEffect(() => {
    setState((s) => ({
      ...s,
      status: 'loading',
    }))

    promiseRef
      .current?.()
      ?.then((value) =>
        setState({
          status: 'success',
          value,
          error: null,
          was: 'success',
        })
      )
      .catch((error) =>
        setState({
          status: 'error',
          value: null,
          error,
          was: 'error',
        })
      )
  }, [
    // Use memoized ref so it doesn't reset on every render.
    promiseRef,
    // Update if the promise switches between a function and undefined so that
    // the loading state updates immediately.
    promiseIsDefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...(deps || []),
  ])

  return useMemo(
    (): LoadingDataWithError<T> =>
      state.status === 'success' || state.was === 'success'
        ? {
            loading: false,
            errored: false,
            updating: state.status === 'loading',
            data: state.value as T,
          }
        : state.status === 'error' || state.was === 'error'
          ? {
              loading: false,
              errored: true,
              updating: state.status === 'loading',
              error: state.error as Error,
            }
          : {
              loading: true,
              errored: false,
            },
    [state]
  )
}
