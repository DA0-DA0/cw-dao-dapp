import {
  Action,
  ActionMatchSuccess,
  ActionOptions,
  IActionMatcher,
  MessageProcessor,
  UnifiedCosmosMsg,
} from '@dao-dao/types'

import { ActionDecoder } from './ActionDecoder'

type Match = {
  action: Action
  match: ActionMatchSuccess
}

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
      let messageIndex = 0
      while (messageIndex < processedMessages.length) {
        const messagesToMatch = processedMessages.slice(messageIndex)

        // Match all actions, and return once the first sequential match is
        // found. This must be the match closest to the start of the list, which
        // can only be decided once all actions before it fail to match. We
        // spawn all promises in parallel and resolve once the first sequential
        // match is found, ignoring the results of matches after it.
        const matched = await new Promise<Match>(async (resolve, reject) => {
          // Track the results of each action.
          //
          // - null: Match processing.
          // - false: Match failed.
          // - Match: Match found.
          const results: (Match | false | null)[] = this._actions.map(
            () => null
          )

          let matched = false

          await Promise.all(
            this._actions.map(async (action, actionIndex) => {
              // If match already found, stop.
              if (matched) {
                return
              }

              try {
                await action.init()

                // If match already found, stop.
                if (matched) {
                  return
                }

                const match = await action.match(messagesToMatch)

                // If match already found, stop.
                if (matched) {
                  return
                }

                if (match) {
                  // Matched.
                  results[actionIndex] = {
                    action,
                    match,
                  }
                }
              } catch {}

              // If match already found, stop.
              if (matched) {
                return
              }

              // Match failed.
              if (!results[actionIndex]) {
                results[actionIndex] = false
              }

              // Find the first sequential match by finding the first non-false
              // entry and seeing if it is a match.
              const firstNonFalse = results.find((r) => r !== false)
              if (firstNonFalse) {
                matched = true
                resolve(firstNonFalse)
              }
            })
          )

          // If all the match attempts above finished and did not resolve, then
          // there is no match. There should always be a match since Custom
          // matches all, so this should never happen.
          if (!matched) {
            console.error('No match found for message.', messagesToMatch)
            reject(new Error('No match found for message.'))
          }
        })

        const count = matched.match === true ? 1 : matched.match
        matches.push(
          new ActionDecoder(
            matched.action,
            processedMessages.slice(messageIndex, messageIndex + count)
          )
        )
        messageIndex += count
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
