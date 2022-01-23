const CHAIN_PREFIX = process.env.NEXT_PUBLIC_CHAIN_BECH32_PREFIX as string

// We need to remove the chain prefix in these functions because otherwise it is
// impossible to tell when addresses are the right length. For example, how do
// you determine if junoabd...1ef belongs to a chain called junoa, or junoab, or
// jun?

// Validates a bech32 address.
export function isValidAddress(address: string): boolean {
  const bech32Regex = /^[a-km-zA-HJ-NP-Z0-9]{39,59}$/im
  if (!address?.length) {
    return false
  }
  const unprefixed = address.replace(CHAIN_PREFIX, '')
  return !!unprefixed.match(bech32Regex)
}

export function isValidContractAddress(address: string): boolean {
  const bech32Regex = /^[a-km-zA-HJ-NP-Z0-9]{59}$/im
  if (!address?.length) {
    return false
  }
  // Need to remove the chain prefix as otherwise the
  const unprefixed = address.replace(CHAIN_PREFIX, '')
  return !!unprefixed.match(bech32Regex)
}
