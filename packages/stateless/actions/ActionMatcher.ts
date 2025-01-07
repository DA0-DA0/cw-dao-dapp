import {
  Action,
  ActionOptions,
  IActionMatcher,
  MessageProcessor,
  UnifiedCosmosMsg,
} from '@dao-dao/types'

import { ActionDecoder } from './ActionDecoder'

export class ActionMatcher implements IActionMatcher {
  private _actions: readonly Action[] = []

  private _status: 'idle' | 'loading' | 'error' | 'ready' = 'idle'
  private _error?: Error
  private _matches?: ActionDecoder[]
  private _messages?: UnifiedCosmosMsg[]

  constructor(
    public options: ActionOptions,
    public messageProcessor: MessageProcessor,
    actions: Action[]
  ) {
    this.actions = actions
  }

  set actions(actions: Action[]) {
    // Sort by match priority.
    this._actions = [...actions].sort(
      (a, b) =>
        (b.metadata.matchPriority ?? 0) - (a.metadata.matchPriority ?? 0)
    )
  }

  get status() {
    return this._status
  }

  get matches() {
    if (!this.ready || !this._matches) {
      throw new Error('Matcher not ready')
    }

    return this._matches
  }

  get idle() {
    return this._status === 'idle'
  }

  get loading() {
    return this._status === 'loading'
  }

  get errored() {
    return this._status === 'error'
  }

  get ready() {
    return this._status === 'ready'
  }

  get error() {
    if (this._status !== 'error') {
      throw new Error('Matcher did not error')
    }

    return this._error || new Error('Unknown matcher error')
  }

  get messages() {
    if (!this._messages) {
      throw new Error('Messages not set')
    }

    return this._messages
  }

  async match(messages: UnifiedCosmosMsg[]): Promise<ActionDecoder[]> {
    this._status = 'loading'
    this._error = undefined
    this._matches = undefined
    this._messages = messages

    try {
      const matches: ActionDecoder[] = []

      const processedMessages = await Promise.all(
        messages.map((message) =>
          this.messageProcessor({
            chainId: this.options.chain.chainId,
            sender: this.options.address,
            message,
            queryClient: this.options.queryClient,
          })
        )
      )

      // Iterate through all messages, greedily matching actions.
      let index = 0
      while (index < processedMessages.length) {
        const matched = (
          await Promise.allSettled(
            this._actions.map(async (action) => {
              await action.init()

              return {
                action,
                match: await action.match(processedMessages.slice(index)),
              }
            })
          )
        ).flatMap((p) =>
          p.status === 'fulfilled' && p.value.match
            ? {
                action: p.value.action,
                match: p.value.match,
              }
            : []
        )[0]

        // There should always be a match since Custom matches all.
        if (matched) {
          const count = matched.match === true ? 1 : matched.match
          matches.push(
            new ActionDecoder(
              matched.action,
              processedMessages.slice(index, index + count)
            )
          )
          index += count
        } else {
          throw new Error('No match found for message.')
        }
      }

      this._matches = matches
      this._status = 'ready'

      return this._matches
    } catch (error) {
      this._error = error instanceof Error ? error : new Error(`${error}`)
      this._status = 'error'
      throw error
    }
  }
}
