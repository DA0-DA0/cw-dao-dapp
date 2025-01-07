import { BigNumber } from 'bignumber.js'

const valueToBigNumber = (n: HugeDecimal.Value): BigNumber =>
  n === null || n === undefined
    ? new BigNumber(NaN)
    : n instanceof BigNumber
      ? n
      : n instanceof HugeDecimal
        ? n['value']
        : typeof n === 'bigint'
          ? new BigNumber(n.toString())
          : typeof n === 'object' && 'amount' in n
            ? valueToBigNumber(n.amount)
            : new BigNumber(n)

interface AmountWrapper {
  amount: string
}

interface Coin {
  amount: string
  denom: string
}

export namespace HugeDecimal {
  export type Value =
    | BigNumber
    | BigNumber.Value
    | bigint
    | HugeDecimal
    | AmountWrapper
}

export class HugeDecimal {
  private value: BigNumber

  /**
   * Returns a new instance of a HugeDecimal object with value `n`, where `n` is
   * a numeric value in base 10.
   *
   * @param n the value
   * @returns a HugeDecimal instance
   */
  constructor(n: HugeDecimal.Value) {
    this.value = valueToBigNumber(n)
  }

  /**
   * Returns a new instance of a HugeDecimal object with value `n`, where `n` is
   * a numeric value in base 10.
   *
   * @param n the value
   * @returns a HugeDecimal instance
   */
  static from(n: HugeDecimal.Value) {
    if (n instanceof HugeDecimal) {
      return n
    }
    return new HugeDecimal(n)
  }

  /**
   * Create a HugeDecimal from a value that is in human-readable format, which
   * means it has decimals and describes a human-readable token amount. For
   * example: `1.000000 $NTRN`.
   *
   * This will convert the value to its raw integer representation by
   * multiplying by 10^decimals.
   *
   * @param n the value
   * @param decimals the number of decimals
   * @returns a HugeDecimal instance
   */
  static fromHumanReadable(n: HugeDecimal.Value, decimals: number) {
    // Multiply by 10^decimals to convert to the integer representation.
    return HugeDecimal.from(n).times(BigNumber(10).pow(decimals))
  }

  /**
   * Returns a HugeDecimal whose value is the maximum of the arguments.
   *
   * @param n values
   * @returns a HugeDecimal instance
   */
  static max(...n: HugeDecimal.Value[]) {
    return new HugeDecimal(BigNumber.max(...n.map(valueToBigNumber)))
  }

  /**
   * Returns a HugeDecimal whose value is the minimum of the arguments.
   *
   * @param n values
   * @returns a HugeDecimal instance
   */
  static min(...n: HugeDecimal.Value[]) {
    return new HugeDecimal(BigNumber.min(...n.map(valueToBigNumber)))
  }

  /**
   * Returns a HugeDecimal instance with value 0.
   */
  static get zero() {
    return new HugeDecimal(0)
  }

  /**
   * Returns a HugeDecimal instance with value 1.
   */
  static get one() {
    return new HugeDecimal(1)
  }

  toJSON() {
    return this.value.toJSON()
  }

  /**
   * Returns the value of this HugeDecimal instance as a JavaScript primitive
   * number.
   *
   * Pass `truncateDecimals` to truncate to a specific number of decimal places.
   * Leaving it undefined will preserve all existing decimal places.
   *
   * @param truncateDecimals whether or not to truncate the decimal places
   * @returns a number
   */
  toNumber(truncateDecimals?: number) {
    return truncateDecimals !== undefined
      ? Number(this.toFixed(truncateDecimals))
      : this.value.toNumber()
  }

  /**
   * Returns a string in base-10 in normal notation.
   */
  toString() {
    return this.value.toString(10)
  }

  /**
   * Returns a string in normal notation with exactly `decimals` decimal places.
   *
   * @param decimals decimals
   * @returns a string
   */
  toFixed(decimals: number) {
    return this.value.toFixed(decimals, BigNumber.ROUND_DOWN)
  }

  valueOf() {
    return this.value.valueOf()
  }

  /**
   * Returns the integer value of this HugeDecimal with decimals truncated.
   */
  trunc() {
    return new HugeDecimal(this.value.integerValue(BigNumber.ROUND_DOWN))
  }

  plus(n: HugeDecimal.Value) {
    return new HugeDecimal(this.value.plus(valueToBigNumber(n)))
  }

  minus(n: HugeDecimal.Value) {
    return new HugeDecimal(this.value.minus(valueToBigNumber(n)))
  }

  times(n: HugeDecimal.Value) {
    return new HugeDecimal(this.value.times(valueToBigNumber(n)))
  }

  div(n: HugeDecimal.Value) {
    return new HugeDecimal(this.value.div(valueToBigNumber(n)))
  }

  /**
   * Returns whether or not the value is greater than zero.
   */
  isPositive() {
    return this.value.gt(0)
  }

  isZero() {
    return this.value.isZero()
  }

  isNaN() {
    return this.value.isNaN()
  }

  lt(n: HugeDecimal.Value) {
    return this.value.lt(valueToBigNumber(n))
  }

  lte(n: HugeDecimal.Value) {
    return this.value.lte(valueToBigNumber(n))
  }

  gt(n: HugeDecimal.Value) {
    return this.value.gt(valueToBigNumber(n))
  }

  gte(n: HugeDecimal.Value) {
    return this.value.gte(valueToBigNumber(n))
  }

  eq(n: HugeDecimal.Value) {
    return this.value.eq(valueToBigNumber(n))
  }

  pow(n: HugeDecimal.Value) {
    return new HugeDecimal(this.value.pow(valueToBigNumber(n)))
  }

  abs() {
    return new HugeDecimal(this.value.abs())
  }

  /**
   * Returns a HugeDecimal whose value is the value of this HugeDecimal negated,
   * i.e. multiplied by -1.
   */
  negated() {
    return new HugeDecimal(this.value.negated())
  }

  /**
   * Returns a HugeDecimal instance with `decimals` decimal places.
   *
   * @param decimals the number of decimal places
   * @returns HugeDecimal instance
   */
  toHumanReadable(decimals: number): HugeDecimal {
    return new HugeDecimal(
      this.div(BigNumber(10).pow(decimals)).toFixed(decimals)
    )
  }

  /**
   * Returns a human-readable number with `decimals` decimal places.
   *
   * @param decimals the number of decimal places
   * @returns human-readable number
   */
  toHumanReadableNumber(decimals: number): number {
    return this.toHumanReadable(decimals).toNumber()
  }

  /**
   * Returns a human-readable string with `decimals` decimal places.
   *
   * @param decimals the number of decimal places
   * @returns human-readable string
   */
  toHumanReadableString(decimals: number): string {
    return this.toHumanReadable(decimals).toString()
  }

  /**
   * Returns an internationalized human-readable string with abbreviation of
   * large numbers.
   *
   * @returns an internationalized human-readable string
   */
  toInternationalizedHumanReadableString({
    decimals = 0,
    showFullAmount = true,
    minDecimals = 0,
  }: {
    /**
     * The number of decimals used to make this number human-readable. Defaults
     * to 0.
     */
    decimals?: number
    /**
     * Whether or not to show the full amount. Large numbers will be abbreviated
     * if this is false. Defaults to true.
     */
    showFullAmount?: boolean
    /**
     * The minimum number of decimal places to show. Defaults to the smallest
     * number of non-zero decimal places less than or equal to `decimals`.
     */
    minDecimals?: number
  } = {}): string {
    // Get the decimal separator for the current locale.
    const decimalSeparator = (1.1).toLocaleString()[1]

    const human = this.toHumanReadable(decimals)

    // Use BigInt for integer part of the number, and add the decimals manually.
    // If the number is too large to fit within the size of Number, must use
    // this BigInt approach even when not showing the full amount.
    if (showFullAmount || human.gte(Number.MAX_SAFE_INTEGER)) {
      const int = human.trunc()
      const dec = human.minus(int)

      // Show at least minDecimals, up to the exact number of decimal places in
      // the original number, if showing the full amount. If not showing the
      // full amount, this number must be very large (based on the conditional
      // above), and thus none (0) of the actual decimal places are shown, since
      // the large part of the number will be abbreviated (e.g. 1,234.5678 gets
      // converted into 1.23K, and the 0.5678 are hidden).
      const decimalPlacesToShow = showFullAmount
        ? Math.max(
            dec.value.toFormat({ decimalSeparator }).split(decimalSeparator)[1]
              ?.length ?? 0,
            minDecimals
          )
        : 0

      const intStr = BigInt(int.toFixed(0)).toLocaleString(
        undefined,
        showFullAmount
          ? undefined
          : {
              notation: 'compact',
              // Cap minDecimals to 20, which is the maximum allowed.
              maximumFractionDigits: Math.min(
                Math.max(2, minDecimals),
                20
              ) as 20,
            }
      )
      const decStr =
        decimalPlacesToShow > 0
          ? decimalSeparator +
            dec.value
              .toFormat(decimalPlacesToShow, { decimalSeparator })
              .split(decimalSeparator)[1]
          : ''

      return intStr + decStr
    }
    // If entire number can fit within the size of Number and not showing the
    // full amount, use Number for compact internationalized formatting.
    else {
      const human = this.toHumanReadableNumber(decimals)
      return human.toLocaleString(undefined, {
        notation: 'compact',
        minimumFractionDigits: minDecimals || (human >= 1000 ? 2 : undefined),
        maximumFractionDigits: Math.max(
          minDecimals,
          human >= 1000 ? 2 : decimals
        ),
      })
    }
  }

  /**
   * Returns a Coin object with the amount and denom.
   *
   * @param denom the denom
   * @returns Coin object
   */
  toCoin(denom: string): Coin {
    return {
      amount: this.toFixed(0),
      denom,
    }
  }

  /**
   * Returns an array containing a single Coin object with the amount and denom.
   *
   * @param denom the denom
   * @returns array containing a single Coin object
   */
  toCoins(denom: string): Coin[] {
    return [this.toCoin(denom)]
  }

  /**
   * Returns the USD value.
   *
   * @param decimals the number of decimals
   * @param usdUnitPrice the USD unit price of the token (with decimals)
   * @returns USD value
   */
  toUsdValue(decimals: number, usdUnitPrice: BigNumber.Value) {
    return this.toHumanReadable(decimals).times(usdUnitPrice).toNumber()
  }
}
