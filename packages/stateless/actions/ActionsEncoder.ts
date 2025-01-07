import {
  Action,
  ActionEncodeContext,
  ActionKey,
  ActionKeyAndDataNoId,
  IActionsEncoder,
  UnifiedCosmosMsg,
} from '@dao-dao/types'

export class ActionsEncoder implements IActionsEncoder {
  private actionMap: Record<ActionKey, Action>

  private _status: 'idle' | 'loading' | 'error' | 'ready' = 'idle'
  private _error?: Error
  private _messages?: UnifiedCosmosMsg[]

  constructor(
    private encodeContext: ActionEncodeContext,
    actions: Action[]
  ) {
    this.actionMap = actions.reduce(
      (acc, action) => {
        acc[action.key] = action
        return acc
      },
      {} as Record<ActionKey, Action>
    )
  }

  get status() {
    return this._status
  }

  get messages() {
    if (this._status !== 'ready' || !this._messages) {
      throw new Error('Encoder not ready')
    }

    return this._messages
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
    if (this._status !== 'error' || !this._error) {
      throw new Error('Matcher did not error')
    }

    return this._error
  }

  async encode(
    actionKeysAndData: ActionKeyAndDataNoId[]
  ): Promise<UnifiedCosmosMsg[]> {
    this._status = 'loading'
    this._error = undefined
    this._messages = undefined

    try {
      const encoded = (
        await Promise.all(
          actionKeysAndData.map(async ({ actionKey, data }, index) => {
            // If no action key, skip it.
            if (!actionKey) {
              return []
            }

            // If no data, throw error because this is invalidly selected.
            if (!data) {
              throw new Error(
                `No action data for action ${index + 1} with key ${actionKey}.`
              )
            }

            const action = this.actionMap[actionKey]
            // If no action found, skip it. This may occur if using a cached
            // action key that no longer exists.
            if (!action) {
              return []
            }

            try {
              await action.init()

              return await action.encode(data, this.encodeContext)
            } catch (error) {
              throw new Error(
                `Error from action ${index + 1} with key ${action.key}: ${
                  error instanceof Error ? error.message : error
                }`,
                {
                  cause: error,
                }
              )
            }
          })
        )
      ).flat()

      this._messages = encoded
      this._status = 'ready'

      return this._messages
    } catch (error) {
      console.error('ActionsEncoder error', error)
      this._error = error instanceof Error ? error : new Error(`${error}`)
      this._status = 'error'
      throw error
    }
  }
}
