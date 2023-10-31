import { Coin, coin } from '@cosmjs/stargate'
import { useCallback, useMemo } from 'react'

import { MsgMint } from '@dao-dao/protobuf/codegen/osmosis/tokenfactory/v1beta1/tx'
import { HerbEmoji } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionKey,
  ActionMaker,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import {
  convertDenomToMicroDenomWithDecimals,
  convertMicroDenomToDenomWithDecimals,
  isDecodedStargateMsg,
  makeStargateMessage,
} from '@dao-dao/utils'

import { useActionOptions } from '../../../../../actions'
import { useGovernanceTokenInfo } from '../../hooks'
import { MintComponent as StatelessMintComponent } from './MintComponent'

export interface MintData {
  amount: number
}

const useDefaults: UseDefaults<MintData> = () => ({
  amount: 1,
})

const useTransformToCosmos: UseTransformToCosmos<MintData> = () => {
  const { address } = useActionOptions()
  const { governanceTokenAddress, governanceTokenInfo } =
    useGovernanceTokenInfo()

  return useCallback(
    (data: MintData) => {
      const amount = convertDenomToMicroDenomWithDecimals(
        data.amount,
        governanceTokenInfo.decimals
      )
      return makeStargateMessage({
        stargate: {
          typeUrl: MsgMint.typeUrl,
          value: {
            sender: address,
            amount: coin(amount, governanceTokenAddress),
          } as MsgMint,
        },
      })
    },
    [address, governanceTokenAddress, governanceTokenInfo.decimals]
  )
}

const useDecodedCosmosMsg: UseDecodedCosmosMsg<MintData> = (
  msg: Record<string, any>
) => {
  const {
    governanceTokenAddress,
    governanceTokenInfo: { decimals },
  } = useGovernanceTokenInfo()

  return useMemo(() => {
    if (
      !isDecodedStargateMsg(msg) ||
      msg.stargate.typeUrl !== MsgMint.typeUrl
    ) {
      return {
        match: false,
      }
    }

    const { denom, amount } = msg.stargate.value.amount as Coin

    return governanceTokenAddress === denom
      ? {
          match: true,
          data: {
            amount: convertMicroDenomToDenomWithDecimals(amount, decimals),
          },
        }
      : {
          match: false,
        }
  }, [governanceTokenAddress, decimals, msg])
}

const Component: ActionComponent = (props) => {
  const { token } = useGovernanceTokenInfo()

  return (
    <StatelessMintComponent
      {...props}
      options={{
        govToken: token,
      }}
    />
  )
}

export const makeMintAction: ActionMaker<MintData> = ({ t }) => ({
  key: ActionKey.Mint,
  Icon: HerbEmoji,
  label: t('title.mint'),
  description: t('info.mintActionDescription'),
  Component,
  useDefaults,
  useTransformToCosmos,
  useDecodedCosmosMsg,
})
