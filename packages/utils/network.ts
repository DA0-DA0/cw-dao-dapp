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
