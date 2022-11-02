import { useCallback, useMemo, useState } from 'react'
import { constSelector, useRecoilValueLoadable } from 'recoil'

import { contractAdminSelector } from '@dao-dao/state'
import { UpdateAdminEmoji } from '@dao-dao/stateless'
import {
  ActionComponent,
  ActionKey,
  ActionMaker,
  UseDecodedCosmosMsg,
  UseDefaults,
  UseTransformToCosmos,
} from '@dao-dao/types/actions'
import { isValidContractAddress } from '@dao-dao/utils'

import { UpdateAdminComponent as StatelessUpdateAdminComponent } from '../components/UpdateAdmin'

interface UpdateAdminData {
  contract: string
  newAdmin: string
}

const useDefaults: UseDefaults<UpdateAdminData> = () => ({
  contract: '',
  newAdmin: '',
})

const useTransformToCosmos: UseTransformToCosmos<UpdateAdminData> = () =>
  useCallback(
    ({ contract, newAdmin }: UpdateAdminData) => ({
      wasm: {
        update_admin: {
          contract_addr: contract,
          admin: newAdmin,
        },
      },
    }),
    []
  )

const useDecodedCosmosMsg: UseDecodedCosmosMsg<UpdateAdminData> = (
  msg: Record<string, any>
) =>
  useMemo(
    () =>
      'wasm' in msg && 'update_admin' in msg.wasm
        ? {
            match: true,
            data: {
              contract: msg.wasm.update_admin.contract_addr,
              newAdmin: msg.wasm.update_admin.admin,
            },
          }
        : { match: false },
    [msg]
  )

export const makeUpdateAdminAction: ActionMaker<UpdateAdminData> = ({
  t,
  chainId,
  bech32Prefix,
}) => {
  const Component: ActionComponent = (props) => {
    const [contract, setContract] = useState('')

    const admin = useRecoilValueLoadable(
      contract && isValidContractAddress(contract, bech32Prefix)
        ? contractAdminSelector({
            contractAddress: contract,
            chainId,
          })
        : constSelector(undefined)
    )

    return (
      <StatelessUpdateAdminComponent
        {...props}
        options={{
          contractAdmin:
            admin.state === 'hasValue' ? admin.contents : undefined,
          onContractChange: (contract: string) => setContract(contract),
        }}
      />
    )
  }

  return {
    key: ActionKey.UpdateAdmin,
    Icon: UpdateAdminEmoji,
    label: t('title.updateContractAdmin'),
    description: t('info.updateContractAdminActionDescription'),
    Component,
    useDefaults,
    useTransformToCosmos,
    useDecodedCosmosMsg,
  }
}
