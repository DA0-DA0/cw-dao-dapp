import { useEffect, useMemo, useRef, useState } from 'react'
import { RecoilValue, constSelector, useRecoilValueLoadable } from 'recoil'
import { useDeepCompareMemoize } from 'use-deep-compare-effect'

import {
  CachedLoadable,
  LoadingData,
  LoadingDataWithError,
} from '@dao-dao/types'
import {
  loadableToLoadingData,
  loadableToLoadingDataWithError,
} from '@dao-dao/utils'

// Keep cache of previously loaded data until next data is ready. Essentially,
// memoize a loadable to prevent UI flickering. If recoilValue is undefined,
// pretend like we are loading until we get a selector to load. This may happen
// if a query depends on data not available right away, such as a wallet
// address.
export const useCachedLoadable = <T extends unknown>(
  recoilValue: RecoilValue<T> | undefined
): CachedLoadable<T> => {
  const loadable = useRecoilValueLoadable(
    // If not on a browser, or recoilValue is undefined, return undefined as we
    // cannot load yet.
    typeof window === 'undefined' || !recoilValue
      ? constSelector(undefined)
      : recoilValue
  )
  const loadableLoadingOrNotReady =
    loadable.state === 'loading' ||
    typeof window === 'undefined' ||
    !recoilValue

  // Since `contents` is set in a `useEffect`, it will take 1 extra render once
  // the loadable has data ready before the cached `contents` state will contain
  // the loaded value. This flag ensures that loading continues to display until
  // `contents` has been updated with its first `loadable.contents` value. If we
  // didn't do this, there would be a moment where `state === "hasValue"` with
  // `contents` still undefined.
  const [contentsHasValue, setContentsHasValue] = useState(
    // If the loadable is ready on first render, just set it right away.
    loadable.state === 'hasValue'
  )
  const [contents, setContents] = useState<T | undefined>(
    // If the loadable is ready on first render, just set it right away.
    loadable.state === 'hasValue' ? loadable.contents : undefined
  )
  const [initialLoading, setInitialLoading] = useState(
    loadableLoadingOrNotReady
  )
  const [updating, setUpdating] = useState(loadableLoadingOrNotReady)

  useEffect(() => {
    if (loadableLoadingOrNotReady) {
      setUpdating(true)
      // Reset state if recoilValue becomes undefined. This may happen if a
      // query depends on form input state, like an address, that may toggle
      // between valid and invalid. This ensures that old data is not shown
      // for a moment while waiting for a new query.
      if (!recoilValue) {
        setInitialLoading(true)
        setContents(undefined)
        setContentsHasValue(false)
      }
    } else if (loadable.state === 'hasValue') {
      setInitialLoading(false)
      setUpdating(false)
      setContents(loadable.contents)
      setContentsHasValue(true)
    } else if (loadable.state === 'hasError') {
      setInitialLoading(false)
      setUpdating(false)
    }
  }, [loadable, loadableLoadingOrNotReady, recoilValue])

  // Memoize the loadable so it can be used in `useEffect` dependencies to
  // prevent causing infinite loops. If this is not memoized, it will change on
  // every render, which may cause infinite loops if the `useEffect` sets some
  // state that causes additional re-renders.
  const cachedLoadable = useMemo(
    (): CachedLoadable<T> =>
      initialLoading ||
      !recoilValue ||
      // Keep loading until contents has first value set. However if an error is
      // present, override and return the error.
      (loadable.state !== 'hasError' && !contentsHasValue)
        ? {
            state: 'loading',
            contents: undefined,
          }
        : loadable.state === 'hasError'
        ? {
            state: 'hasError',
            contents: loadable.contents,
          }
        : {
            state: 'hasValue',
            contents: contents as T,
            updating,
          },
    [
      contents,
      contentsHasValue,
      initialLoading,
      loadable.contents,
      loadable.state,
      recoilValue,
      updating,
    ]
  )

  return cachedLoadable
}

// The following hooks are convenience hooks that use the above hook to
// cache loaded data and then convert the loadable to our convenience loading
// types, which are more useful in UI components. Read why they are useful
// in the comment above the LoadingData types.

// Convert to LoadingDataWithError for convenience, memoized.
export const useCachedLoadingWithError = <T extends unknown>(
  recoilValue: RecoilValue<T> | undefined
): LoadingDataWithError<T> => {
  const loadable = useCachedLoadable(recoilValue)
  return useMemo(() => loadableToLoadingDataWithError(loadable), [loadable])
}

// Convert to LoadingData for convenience, memoized.
export const useCachedLoading = <T extends unknown>(
  recoilValue: RecoilValue<T> | undefined,
  defaultValue: T,
  onError?: (error: any) => void
): LoadingData<T> => {
  const loadable = useCachedLoadable(recoilValue)

  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Use deep compare to prevent memoize on every re-render if an object is
  // passed as the default value.
  const memoizedDefaultValue = useDeepCompareMemoize(defaultValue)

  return useMemo(
    () =>
      loadableToLoadingData(loadable, memoizedDefaultValue, onErrorRef.current),
    [loadable, memoizedDefaultValue]
  )
}
