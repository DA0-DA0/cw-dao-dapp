import { OfflineAminoSigner, makeSignDoc } from '@cosmjs/amino'

import {
  getChainForChainId,
  getNativeTokenForChainId,
  getPublicKeyTypeForChain,
} from './chain'

export type SignatureOptions<
  Data extends Record<string, unknown> | undefined = Record<string, any>,
> = {
  type: string
  nonce: number
  chainId: string
  address: string
  hexPublicKey: string
  data: Data
  offlineSignerAmino: OfflineAminoSigner
  /**
   * If true, don't sign the message and leave the signature field blank.
   * Defaults to false.
   */
  generateOnly?: boolean
}

export type Auth = {
  type: string
  nonce: number
  chainId: string
  chainFeeDenom: string
  chainBech32Prefix: string
  publicKeyType: string
  publicKeyHex: string
  // Backwards compatible.
  publicKey: string
}

export type SignedBody<
  Data extends Record<string, unknown> | undefined = Record<string, any>,
> = {
  data: {
    auth: Auth
  } & Data
  signature: string
}

/**
 * Function to sign a message as a wallet in the format expected by our various
 * off-chain services.
 */
export const signOffChainAuth = async <
  Data extends Record<string, unknown> | undefined = Record<string, any>,
>({
  type,
  nonce,
  chainId,
  address,
  hexPublicKey,
  data,
  offlineSignerAmino,
  generateOnly = false,
}: SignatureOptions<Data>): Promise<SignedBody<Data>> => {
  const chain = getChainForChainId(chainId)

  const dataWithAuth: SignedBody<Data>['data'] = {
    ...data,
    auth: {
      type,
      nonce,
      chainId,
      chainFeeDenom: getNativeTokenForChainId(chainId).denomOrAddress,
      chainBech32Prefix: chain.bech32Prefix,
      publicKeyType: getPublicKeyTypeForChain(chainId),
      publicKeyHex: hexPublicKey,
      // Backwards compatible.
      publicKey: hexPublicKey,
    },
  }

  // Generate data to sign.
  const signDocAmino = makeSignDoc(
    [
      {
        type: dataWithAuth.auth.type,
        value: {
          signer: address,
          data: JSON.stringify(dataWithAuth, undefined, 2),
        },
      },
    ],
    {
      gas: '0',
      amount: [
        {
          denom: dataWithAuth.auth.chainFeeDenom,
          amount: '0',
        },
      ],
    },
    chain.chainId,
    '',
    0,
    0
  )

  let signature = ''
  // Sign data.
  if (!generateOnly) {
    signature = (await offlineSignerAmino.signAmino(address, signDocAmino))
      .signature.signature
  }

  const signedBody: SignedBody<Data> = {
    data: dataWithAuth,
    signature,
  }

  return signedBody
}
