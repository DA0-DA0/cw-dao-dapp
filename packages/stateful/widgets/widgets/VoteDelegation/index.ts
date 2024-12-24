import { EscalatorWarningRounded } from '@mui/icons-material'

import {
  ActionContextType,
  ContractVersion,
  VoteDelegationWidgetData,
  Widget,
  WidgetId,
  WidgetLocation,
  WidgetVisibilityContext,
} from '@dao-dao/types'
import {
  makeExecuteSmartContractMessage,
  objectMatchesStructure,
} from '@dao-dao/utils'

import { Editor } from './Editor'

export const VoteDelegationWidget: Widget<VoteDelegationWidgetData> = {
  id: WidgetId.VoteDelegation,
  Icon: EscalatorWarningRounded,
  IconFilled: EscalatorWarningRounded,
  location: WidgetLocation.Manual,
  visibilityContext: WidgetVisibilityContext.Always,
  minVersion: ContractVersion.V270Alpha2,
  // supportsDaoCreation: true,
  defaultValues: {
    address: '',
  },
  Editor,
  editAction: {
    // Add hook messages.
    encode: async ({ address }, options) => {
      if (options.context.type !== ActionContextType.Dao) {
        throw new Error('Invalid context')
      }
      const { dao } = options.context

      const hookCaller = await dao.votingModule.getHookCaller()

      return [
        // Voting module hook.
        makeExecuteSmartContractMessage({
          chainId: dao.chainId,
          sender: dao.coreAddress,
          contractAddress: hookCaller,
          msg: {
            add_hook: {
              addr: address,
            },
          },
        }),
        // Proposal module vote hooks and delegation module updates.
        ...dao.proposalModules.flatMap((proposalModule) => [
          // Vote hook.
          makeExecuteSmartContractMessage({
            chainId: dao.chainId,
            sender: dao.coreAddress,
            contractAddress: proposalModule.address,
            msg: {
              add_vote_hook: { address },
            },
          }),
          // Delegation module update.
          makeExecuteSmartContractMessage({
            chainId: dao.chainId,
            sender: dao.coreAddress,
            contractAddress: proposalModule.address,
            msg: {
              update_delegation_module: {
                module: address,
              },
            },
          }),
        ]),
      ]
    },
    // Match hook messages.
    match: async ({ address }, messages, options) => {
      if (options.context.type !== ActionContextType.Dao) {
        throw new Error('Invalid context')
      }
      const { dao } = options.context

      const hookCaller = await dao.votingModule.getHookCaller()

      const firstIsVotingModule =
        objectMatchesStructure(messages[0].decodedMessage, {
          wasm: {
            execute: {
              contract_addr: {},
              msg: {
                add_hook: {
                  addr: {},
                },
              },
            },
          },
        }) &&
        messages[0].decodedMessage.wasm.execute.contract_addr === hookCaller &&
        messages[0].decodedMessage.wasm.execute.msg.add_hook.addr === address

      if (!firstIsVotingModule) {
        return false
      }

      // Match at least one for the voting module hook caller above.
      let matches = 1

      // Loop over the rest of the messages and count adjacent proposal module
      // add_vote_hook and update_delegation_module messages.
      for (const { decodedMessage } of messages.slice(1)) {
        const isProposalModuleMessage =
          // Add vote hook.
          ((objectMatchesStructure(decodedMessage, {
            wasm: {
              execute: {
                contract_addr: {},
                msg: {
                  add_vote_hook: {
                    address: {},
                  },
                },
              },
            },
          }) &&
            decodedMessage.wasm.execute.msg.add_vote_hook.address ===
              address) ||
            // Update delegation module.
            (objectMatchesStructure(decodedMessage, {
              wasm: {
                execute: {
                  contract_addr: {},
                  msg: {
                    update_delegation_module: {
                      module: {},
                    },
                  },
                },
              },
            }) &&
              decodedMessage.wasm.execute.msg.update_delegation_module
                .module === address)) &&
          dao.proposalModules.some(
            (p) => decodedMessage.wasm.execute.contract_addr === p.address
          )

        if (!isProposalModuleMessage) {
          break
        }

        // Stop at the first non-match since we expect these to be adjacent.
        matches++
      }

      return matches
    },
  },
}
