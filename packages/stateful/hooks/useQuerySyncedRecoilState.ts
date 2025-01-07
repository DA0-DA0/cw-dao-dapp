import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import { RecoilState, useRecoilState } from 'recoil'

export type UseQuerySyncedRecoilStateOptions<T extends unknown> = {
  /**
   * The query parameter. When undefined, the state will not be synced, making
   * this hook act exactly like `useRecoilState`.
   */
  param?: string
  /**
   * The recoil state atom.
   */
  atom: RecoilState<T>
}

export type UseQuerySyncedRecoilStateReturn<T extends unknown> = ReturnType<
  typeof useRecoilState<T>
>

/**
 * Syncs a piece of recoil state with a query parameter in the URL. This may be
 * used to store a chain in the URL, for example. It is important to ensure that
 * the parameter is unique if this is used multiple times on the same page.
 * Otherwise an infinite loop will occur as the hooks will bounce back and
 * forth. This hook is a sibling to `useQuerySyncedState` in
 * `@dao-dao/stateless`.
 *
 * @param {UseQuerySyncedRecoilStateOptions<T>} options - The options for the
 * function.
 * @param {T} options.param - The query parameter.
 * @param {T} options.atom - The Recoil state atom.
 * @return {UseQuerySyncedRecoilStateReturn<T>} - The value and its setter
 * function, in the same format as `useRecoilState`: `[value, setValue]`.
 */
export const useQuerySyncedRecoilState = <T = string | number>({
  param,
  atom,
}: UseQuerySyncedRecoilStateOptions<T>): UseQuerySyncedRecoilStateReturn<T> => {
  const router = useRouter()
  const [value, setValue] = useRecoilState(atom)

  // On site load, set initial value from query parameter.
  const pageInitialized = useRef(false)
  useEffect(() => {
    if (!router.isReady || pageInitialized.current) {
      return
    }
    pageInitialized.current = true

    if (!param) {
      return
    }

    const initialValue = router.query[param]
    if (typeof initialValue === 'string') {
      setValue(
        (typeof value === 'string'
          ? initialValue
          : typeof value === 'number'
            ? Number(initialValue)
            : initialValue) as any
      )
    }
  }, [param, router.isReady, router.query, setValue, value])

  // On value change, store in query parameter.
  useEffect(() => {
    if (!router.isReady || !pageInitialized.current || !param) {
      return
    }

    const newValue =
      typeof value === 'number' ? BigInt(value).toString() : `${value}`
    if (router.query[param] === newValue) {
      return
    }

    router.query[param] = newValue

    router.replace(
      {
        query: router.query,
      },
      undefined,
      { shallow: true }
    )
  }, [value, router, param])

  return [value, setValue]
}
