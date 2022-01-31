export const DAO_CODE_ID = parseInt(
  process.env.NEXT_PUBLIC_DAO_CONTRACT_CODE_ID as string,
  10
)

export const CW20_CODE_ID = parseInt(
  process.env.NEXT_PUBLIC_CW20_CODE_ID as string,
  10
)

export const STAKE_CODE_ID = parseInt(
  process.env.NEXT_PUBLIC_STAKE_CW20_CODE_ID as string,
  10
)

export const MULTISIG_CODE_ID = parseInt(
  process.env.NEXT_PUBLIC_MULTISIG_CODE_ID as string,
  10
)

export const C4_GROUP_CODE_ID = parseInt(
  process.env.NEXT_PUBLIC_C4_GROUP_CODE_ID as string,
  10
)

export const PUBLIC_CARD_IMAGES_ENABLED =
  process.env.NEXT_PUBLIC_IMAGES_HEADER_ENABLED === 'true'

export const PUBLIC_HEADER_IMAGES_ENABLED =
  process.env.NEXT_PUBLIC_IMAGES_CARD_ENABLED === 'true'

export const NATIVE_DECIMALS = 6

export const STATUS_COLORS: { [key: string]: string } = {
  open: '#00BAFF',
  draft: '#00F',
  executed: '#53D0C9',
  passed: '#6A78FF',
  rejected: '#ED5276',
}
