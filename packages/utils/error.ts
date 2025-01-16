import * as Sentry from '@sentry/nextjs'

import {
  INVALID_CONTRACT_ERROR_SUBSTRINGS,
  NONEXISTENT_QUERY_ERROR_SUBSTRINGS,
} from './constants'

/**
 * Whether or not an error contains a substring or any of a set of substrings.
 */
export const isErrorWithSubstring = (
  error: unknown,
  substringOrSubstrings: string | string[]
): boolean =>
  error instanceof Error &&
  [substringOrSubstrings]
    .flat()
    .some((substring) => (error as Error).message.includes(substring))

/**
 * Whether or not an error is a non-existent query error.
 */
export const isNonexistentQueryError = (error: unknown): boolean =>
  isErrorWithSubstring(error, NONEXISTENT_QUERY_ERROR_SUBSTRINGS)

/**
 * Whether or not an error is an invalid contract error.
 */
export const isInvalidContractError = (error: unknown): boolean =>
  isErrorWithSubstring(error, INVALID_CONTRACT_ERROR_SUBSTRINGS)

// Passing a map will allow common errors to be mapped to a custom error message
// for the given context.
export const processError = (
  error: Error | any,
  {
    tags,
    extra,
    transform,
    overrideCapture,
    forceCapture,
  }: {
    tags?: Record<string, string | number | boolean | null | undefined>
    extra?: Record<string, unknown>
    transform?: Partial<Record<CommonError, string>>
    overrideCapture?: Partial<Record<CommonError, boolean>>
    /**
     * If set to true, will sent error to Sentry. If set to false, will not send
     * error to Sentry. If undefined, will use default behavior (reference the
     * capture map).
     */
    forceCapture?: boolean
  } = {}
): string => {
  // Convert to error type.
  if (!(error instanceof Error)) {
    error = new Error(
      `${
        // Some errors are not Error classes but have a message property.
        typeof error === 'object' && 'message' in error ? error.message : error
      }`
    )
  }

  const { message } = error as Error
  let recognizedError

  // Attempt to recognize error.
  for (const [commonError, patterns] of commonErrorPatternsEntries) {
    // Match if any elements are matches.
    const match = patterns.some((pattern) =>
      Array.isArray(pattern)
        ? // If array of strings, every element must match.
          pattern.every((p) => message.includes(p))
        : message.includes(pattern)
    )
    // If recognized error, break.
    if (match) {
      recognizedError = commonError
      break
    }
  }

  // If recognized error, try to find it in the map, or else return the
  // recognized error.
  if (recognizedError) {
    // Send to Sentry if we want to capture this recognized error.
    if (
      forceCapture !== false &&
      ((forceCapture === true ||
        (overrideCapture && overrideCapture[recognizedError])) ??
        captureCommonErrorMap[recognizedError])
    ) {
      Sentry.captureException(error, { extra, tags })
    }

    return ((transform && transform[recognizedError]) ||
      recognizedError) as string
  }

  // If we did not recognize the error and it's a Cosmos SDK error with a
  // stacktrace, extract the error from the last line (since the first n-1 lines
  // are golang stacktrace). This is a common string displayed in Cosmos SDK
  // stacktraces.
  if (
    message.includes('github.com/cosmos/cosmos-sdk/baseapp.gRPCErrorToSDKError')
  ) {
    error = new Error(message.split('\n').slice(-1)[0])
  }

  if (forceCapture !== false) {
    // Send to Sentry since we were not expecting it.
    Sentry.captureException(error, { extra, tags })
  }

  return error.message
}

// To add a new error:
// 1. Add a value to this enum.
// 2. Add matching parameters in commonErrorPatterns below.
// 3. If it should be sent to Sentry, add an entry to captureCommonErrorMap.
export enum CommonError {
  RequestRejected = 'Wallet rejected transaction.',
  InvalidAddress = 'Invalid address.',
  InsufficientFees = "Insufficient fees. Reconnect your wallet, ensure you're on the right chain, and try again.",
  InsufficientFunds = 'Insufficient funds.',
  GetClientFailed = 'Failed to get client. Try refreshing the page or reconnecting your wallet.',
  Network = 'Network error. Ensure you are connected to the internet, refresh the page, or try again later. If your network is working, the blockchain nodes may be having problems.',
  Unauthorized = 'Unauthorized.',
  InsufficientForProposalDeposit = 'Insufficient unstaked deposit tokens. Ensure you have enough unstaked deposit tokens to pay for the proposal deposit.',
  PendingTransaction = 'You have another pending transaction. Please try again in 10 seconds.',
  TextEncodingDecodingError = 'Text encoding/decoding error. Invalid character present in text.',
  TxnSentTimeout = 'Transaction sent but has not yet been detected. Refresh this page to view its changes or check back later.',
  InvalidJSONResponse = 'Invalid JSON response from server.',
  BlockHeightTooLow = 'Block height is too low.',
  TxPageOutOfRange = 'Transaction page is out of range.',
  AuthorizationNotFound = 'Authorization does not exist.',
  SignatureVerificationFailed = 'Signature verification failed. Try again in 10 seconds or reach out to us on Discord for help.',
  IbcClientExpired = 'IBC client expired. Reach out to us on Discord for help.',
  NoIndexerForChain = 'No indexer for chain.',
  DaoInactive = 'This DAO is inactive, which means insufficient voting power has been staked. You cannot create a proposal at this time.',
  ReconnectWallet = 'Please disconnect and reconnect your wallet.',
  ProposalTooLarge = 'Proposal is too large. Please remove actions or shorten the description.',
  NoSuchContract = 'Contract not found.',
  ContractInstantiationFailed = 'Contract instantiation failed.',
  ContractExecutionFailed = 'Contract execution failed.',
  ContractMigrationFailed = 'Contract migration failed.',
  InsufficientGas = 'Insufficient gas.',
  ContractNameExists = 'Name already taken.',
  OutOfGas = 'Out of gas.',
  InvalidCoins = 'Invalid coins.',
}

// List of error substrings to match to determine the common error. Elements in
// value are OR'd together. Inner string arrays are AND'd together. For example:
// ["abc", "def"] matches "abc" or "def" or "abc def". ["abc", ["def", "ghi"]]
// matches "abc def ghi" or "def ghi" but NOT "abc def" or "abc ghi".
const commonErrorPatterns: Record<CommonError, (string | string[])[]> = {
  [CommonError.RequestRejected]: ['Request rejected', 'Ledger init aborted'],
  [CommonError.InvalidAddress]: [
    'decoding bech32 failed: invalid checksum',
    'contract: not found',
    // Provided non-DAO address where a DAO address was expected.
    'unknown variant `get_config`',
  ],
  [CommonError.InsufficientFees]: [
    'insufficient fees',
    // sdk code format from polytone listener callback error
    // https://github.com/cosmos/cosmos-sdk/blob/main/types/errors/errors.go
    'codespace: sdk, code: 13',
  ],
  [CommonError.InsufficientFunds]: [
    'insufficient funds',
    ['fee payer address', 'does not exist'],
    // sdk code format from polytone listener callback error
    // https://github.com/cosmos/cosmos-sdk/blob/main/types/errors/errors.go
    'codespace: sdk, code: 5',
  ],
  [CommonError.GetClientFailed]: [
    'Bad status on response: 403',
    'Failed to retrieve account from signer',
  ],
  [CommonError.Network]: [
    'Failed to fetch',
    'socket disconnected',
    'socket hang up',
    'Bad status on response: 5',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'tx already exists in cache',
    'Load failed',
    'fetch failed',
  ],
  [CommonError.Unauthorized]: [
    'Unauthorized',
    // sdk code format from polytone listener callback error
    // https://github.com/cosmos/cosmos-sdk/blob/main/types/errors/errors.go
    'codespace: sdk, code: 4',
  ],
  [CommonError.InsufficientForProposalDeposit]: ['Overflow: Cannot Sub with'],
  [CommonError.PendingTransaction]: ['account sequence mismatch'],
  [CommonError.TextEncodingDecodingError]: ['out of printable ASCII range'],
  [CommonError.TxnSentTimeout]: [
    'was submitted but was not yet found on the chain',
  ],
  [CommonError.InvalidJSONResponse]: [
    'invalid json response body',
    'Unexpected token < in JSON',
  ],
  [CommonError.BlockHeightTooLow]: [
    ['32603', 'not available', 'lowest height is'],
  ],
  [CommonError.TxPageOutOfRange]: [
    ['32603', 'page should be within', 'range', 'given'],
  ],
  [CommonError.AuthorizationNotFound]: ['authorization not found'],
  [CommonError.SignatureVerificationFailed]: [
    [
      'Broadcasting transaction failed',
      'signature verification failed; please verify account number',
      'unauthorized',
    ],
  ],
  [CommonError.IbcClientExpired]: [
    [
      'failed to send packet: cannot send packet using client',
      'Expired: client is not active',
    ],
  ],
  [CommonError.NoIndexerForChain]: ['No indexer for chain'],
  [CommonError.DaoInactive]: [
    'the DAO is currently inactive, you cannot create proposals',
  ],
  [CommonError.ReconnectWallet]: [['Session', 'not established yet']],
  [CommonError.ProposalTooLarge]: [['proposal is', 'bytes, must be <=']],
  [CommonError.NoSuchContract]: [
    'no such contract',
    // wasm code format from polytone listener callback error
    // https://github.com/CosmWasm/wasmd/blob/main/x/wasm/types/errors.go
    'codespace: wasm, code: 22',
  ],
  [CommonError.ContractInstantiationFailed]: [
    // wasm code format from polytone listener callback error
    // https://github.com/CosmWasm/wasmd/blob/main/x/wasm/types/errors.go
    'codespace: wasm, code: 4',
  ],
  [CommonError.ContractExecutionFailed]: [
    // wasm code format from polytone listener callback error
    // https://github.com/CosmWasm/wasmd/blob/main/x/wasm/types/errors.go
    'codespace: wasm, code: 5',
  ],
  [CommonError.ContractMigrationFailed]: [
    // wasm code format from polytone listener callback error
    // https://github.com/CosmWasm/wasmd/blob/main/x/wasm/types/errors.go
    'codespace: wasm, code: 11',
  ],
  [CommonError.InsufficientGas]: [
    // wasm code format from polytone listener callback error
    // https://github.com/CosmWasm/wasmd/blob/main/x/wasm/types/errors.go
    'codespace: wasm, code: 6',
  ],
  [CommonError.ContractNameExists]: ['contract account already exists'],
  [CommonError.OutOfGas]: [
    // sdk code format from polytone listener callback error
    // https://github.com/cosmos/cosmos-sdk/blob/main/types/errors/errors.go
    'codespace: sdk, code: 11',
  ],
  [CommonError.InvalidCoins]: [
    'invalid coins',
    // sdk code format from polytone listener callback error
    // https://github.com/cosmos/cosmos-sdk/blob/main/types/errors/errors.go
    'codespace: sdk, code: 10',
  ],
}
const commonErrorPatternsEntries = Object.entries(commonErrorPatterns) as [
  CommonError,
  (string | string[])[],
][]

// Whether or not to send the error to Sentry. Some errors we want to clean up
// for the user but still investigate (e.g. InvalidJSONResponse), so let's send
// them to Sentry even if we recognize them.
const captureCommonErrorMap: Partial<Record<CommonError, boolean>> = {
  [CommonError.InvalidJSONResponse]: true,
  // This should be reported to us.
  [CommonError.IbcClientExpired]: true,
}
