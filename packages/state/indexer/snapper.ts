import { SNAPPER_API_BASE } from '@dao-dao/utils'

export type QuerySnapperOptions = {
  query: string
  parameters?: Record<string, any>
}

export const querySnapper = async <T = any>({
  query,
  parameters,
}: QuerySnapperOptions): Promise<T | undefined> => {
  // Filter out undefined args.
  if (parameters) {
    parameters = Object.entries(parameters).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value
        }
        return acc
      },
      {} as Record<string, any>
    )
  }

  const params = new URLSearchParams(parameters)

  const url = `${SNAPPER_API_BASE}/q/${query}?${params.toString()}`
  const response = await fetch(url)

  if (response.status >= 300) {
    throw new Error(
      `Error querying snapper for ${query} with params ${params.toString()}: ${
        response.status
      } ${await response.text().catch(() => '')}`.trim()
    )
  }

  // Return undefined and do not attempt to parse body if no content.
  if (response.status === 204) {
    return
  }

  try {
    const text = await response.text()
    return text ? JSON.parse(text) : undefined
  } catch (err) {
    console.error(err)
    // Return undefined
  }
}
