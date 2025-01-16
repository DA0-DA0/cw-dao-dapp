export const pad = (num: number, width = 1, z = '0') => {
  const n = String(num)
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

export const convertToTitlecase = (str: string) =>
  `${str.charAt(0).toUpperCase()}${str.slice(1)}`

/**
 * Join a list of strings into a human readable string.
 *
 * @param arr Collection of strings
 * @param join Final joining word, such as `or`.
 * @returns String
 */
export const humanReadableList = (arr: string[], join = 'or') =>
  arr.length <= 1
    ? arr.join('')
    : arr.length === 2
      ? arr.join(` ${join} `)
      : arr.slice(0, -1).join(', ') + `, ${join} ${arr.slice(-1)}`
