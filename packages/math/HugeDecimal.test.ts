import { HugeDecimal } from './HugeDecimal'

test('HugeDecimal', () => {
  expect(
    HugeDecimal.fromHumanReadable(1234.5678, 6).toFormattedString({
      decimals: 6,
    })
  ).toBe('1,234.5678')

  expect(
    HugeDecimal.fromHumanReadable(1234.5678, 6).toFormattedString({
      decimals: 6,
      minDecimals: 6,
    })
  ).toBe('1,234.567800')

  expect(
    HugeDecimal.fromHumanReadable(1234.5678, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
    })
  ).toBe('1.23K')

  expect(
    HugeDecimal.fromHumanReadable(1234.5678, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
      minDecimals: 0,
    })
  ).toBe('1.23K')

  expect(
    HugeDecimal.fromHumanReadable(1234.5678, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
      minDecimals: 4,
    })
  ).toBe('1.2346K')

  expect(
    HugeDecimal.fromHumanReadable(1234.5678, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
      minDecimals: 8,
    })
  ).toBe('1.23456780K')

  expect(
    HugeDecimal.fromHumanReadable(0.001, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
    })
  ).toBe('0.001')

  expect(
    HugeDecimal.fromHumanReadable(1, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
    })
  ).toBe('1')

  expect(
    HugeDecimal.from('4901849977581594372686').toFormattedString({
      decimals: 6,
      showFullAmount: true,
    })
  ).toBe('4,901,849,977,581,594.372686')

  expect(
    HugeDecimal.from('4901849977581594372686').toFormattedString({
      decimals: 6,
      showFullAmount: true,
      minDecimals: 8,
    })
  ).toBe('4,901,849,977,581,594.37268600')

  expect(
    HugeDecimal.from('4901849977581594372686').toFormattedString({
      decimals: 0,
      showFullAmount: false,
    })
  ).toBe('4,901,849,977.58T')

  expect(
    HugeDecimal.from(
      // (BigInt(Number.MAX_SAFE_INTEGER) * 10000n).toString()
      '90071992547409910000'
    ).toFormattedString({
      decimals: 0,
      showFullAmount: false,
    })
  ).toBe('90,071,992.55T')

  expect(
    HugeDecimal.from(
      // (BigInt(Number.MAX_SAFE_INTEGER) * 10000n).toString()
      '90071992547409910000'
    ).toFormattedString({
      decimals: 6,
      showFullAmount: false,
    })
  ).toBe('90.07T')

  expect(
    HugeDecimal.from(
      // (BigInt(Number.MAX_SAFE_INTEGER) * 10000n).toString()
      '90071992547409910000'
    ).toFormattedString({
      decimals: 6,
      showFullAmount: false,
      minDecimals: 6,
    })
  ).toBe('90.071993T')

  expect(
    HugeDecimal.fromHumanReadable(11000027, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
    })
  ).toBe('11.00M')

  expect(
    HugeDecimal.fromHumanReadable(12345678, 6).toFormattedString({
      decimals: 6,
      showFullAmount: false,
    })
  ).toBe('12.35M')
})
