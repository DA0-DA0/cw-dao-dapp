/* eslint-disable react-hooks/rules-of-hooks */

import { useCallback as CwProposalSingleHooks } from 'react'
import { useRecoilValueLoadable } from 'recoil'

import { CwProposalSingleClient as ExecuteClient } from '../../clients/cw-proposal-single'
import {
  ExecuteClientParams,
  executeClient,
} from '../../recoil/selectors/clients/cw-proposal-single'
import { FunctionKeyOf } from '../../types'

const wrapExecuteHook =
  <T extends FunctionKeyOf<ExecuteClient>>(fn: T) =>
  (params: ExecuteClientParams) => {
    const clientLoadable = useRecoilValueLoadable(executeClient(params))
    const client =
      clientLoadable.state === 'hasValue' ? clientLoadable.contents : undefined

    return CwProposalSingleHooks(
      (...args: Parameters<ExecuteClient[T]>) => {
        if (client)
          return (
            client[fn] as (
              ...args: Parameters<ExecuteClient[T]>
            ) => ReturnType<ExecuteClient[T]>
          )(...args)
        throw new Error('Client undefined.')
      },
      [client]
    )
  }

export const usePropose = wrapExecuteHook('propose')
export const useCastVote = wrapExecuteHook('castVote')
export const useExecute = wrapExecuteHook('execute')
export const useClose = wrapExecuteHook('close')
export const useUpdateConfig = wrapExecuteHook('updateConfig')
export const useAddProposalHook = wrapExecuteHook('addProposalHook')
export const useRemoveProposalHook = wrapExecuteHook('removeProposalHook')
export const useAddVoteHook = wrapExecuteHook('addVoteHook')
export const useRemoveVoteHook = wrapExecuteHook('removeVoteHook')
