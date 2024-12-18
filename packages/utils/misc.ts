/**
 * Wrap a promise and give the caller the responsibility to resolve it after the
 * promise succeeds.
 *
 * @param execute Async function to execute. If it throws an error, the promise
 * will be rejected with the error. If it returns false, the promise returns
 * immediately. Otherwise (if it does not return or returns true/undefined), it
 * will be the caller's responsibility to resolve the promise using the resolve
 * function passed into `onComplete`.
 * @param onComplete Once the async function completes without error, this
 * callback is called with the promise's resolve function, allowing the caller
 * to manually trigger the resolve function when ready.
 * @returns Promise that resolves when caller calls the resolve function, which
 * is only possible after the async function completes.
 */
export const makeManuallyResolvedPromise =
  <Params extends unknown[]>(
    execute: (...args: Params) => Promise<boolean | undefined>,
    onComplete: (resolve: () => void) => void
  ) =>
  (...args: Params) =>
    new Promise<void>(async (resolve, reject) => {
      try {
        const result = await execute(...args)

        // If returns false, resolve immediately and return.
        if (result === false) {
          resolve()
          return
        }

        // On completion, store resolve for later use.
        onComplete(resolve)
      } catch (err) {
        reject(err)
      }
    })

/**
 * Attempt to execute `callback` `tries` times and return the result on success
 * or throw the last error. If `delayMs` is provided, wait `delayMs` between
 * attempts.
 *
 * @param tries Number of times to attempt to execute the callback.
 * @param callback Function to execute.
 * @param delayMs Number of milliseconds to wait between attempts.
 * @returns Result of the callback.
 */
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

/**
 * Perform a task on each item in a list in batches of `batchSize`. Optionally
 * retry the task up to `tries` times with a delay of `delayMs` between each
 * attempt.
 *
 * @param list List of items to process.
 * @param batchSize Size of each batch.
 * @param fn Function to execute for each item.
 * @param tries Number of times to retry the task.
 * @param delayMs Number of milliseconds to wait between retries.
 * @returns Result of the callback.
 */
export const batch = async <T extends unknown>({
  list,
  batchSize,
  task,
  tries,
  delayMs,
}: {
  list: T[]
  batchSize: number
  task: (item: T, attempt: number) => Promise<any>
  tries?: number
  delayMs?: number
}): Promise<void> => {
  for (let i = 0; i < list.length; i += batchSize) {
    await Promise.all(
      list
        .slice(i, i + batchSize)
        .map((item) =>
          tries
            ? retry(tries, (attempt) => task(item, attempt), delayMs)
            : task(item, 1)
        )
    )
  }
}
