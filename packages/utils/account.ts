import { Account, AccountType } from '@dao-dao/types'

export const areAccountsEqual = (a: Account, b: Account) =>
  a.type === b.type && a.chainId === b.chainId && a.address === b.address

/**
 * Gets the account on the specified chain or undefined if nonexistent.
 */
export const getAccount = ({
  accounts,
  chainId,
  types = [AccountType.Base, AccountType.Polytone],
}: {
  accounts: readonly Account[]
  chainId?: string
  types?: readonly AccountType[]
}): Account | undefined =>
  accounts.find(
    (account) =>
      types.includes(account.type) && (!chainId || account.chainId === chainId)
  )

/**
 * Gets the account address on the specified chain or undefined if nonexistent.
 */
export const getAccountAddress = (
  ...params: Parameters<typeof getAccount>
): string | undefined => getAccount(...params)?.address

/**
 * Gets the chain ID for an address or undefined if nonexistent.
 */
export const getAccountChainId = ({
  accounts,
  address,
}: {
  accounts: readonly Account[]
  address: string
}): string | undefined =>
  accounts.find((account) => account.address === address)?.chainId
