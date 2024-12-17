export const fetchWithTimeout = async (
  timeout: number,
  ...params: Parameters<typeof fetch>
) => {
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    console.log('Aborting request due to timeout...')
    controller.abort()
  }, timeout)

  try {
    return await fetch(params[0], {
      ...params[1],
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Attempt to execute `callback` `tries` times and return the result on success
// or throw the last error. If `delayMs` is provided, wait `delayMs` between
// attempts.
export const retry = async <T extends unknown>(
  tries: number,
  callback: (attempt: number) => Promise<T>,
  delayMs?: number
): Promise<T> => {
  let attempt = 1
  while (true) {
    try {
      return await callback(attempt)
    } catch (err) {
      attempt++
      if (attempt > tries) {
        throw err
      }

      if (delayMs) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
}
