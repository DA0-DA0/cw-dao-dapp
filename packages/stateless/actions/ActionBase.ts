import {
  Action,
  ActionComponent,
  ActionEncodeContext,
  ActionKey,
  ActionMatch,
  ActionOptions,
  ProcessedMessage,
  UnifiedCosmosMsg,
} from '@dao-dao/types'

export abstract class ActionBase<
  Data extends Record<string, any> = Record<string, any>,
> implements Action<Data>
{
  public abstract readonly key: ActionKey
  public abstract Component: ActionComponent<undefined, Data>

  protected _status: 'idle' | 'loading' | 'error' | 'ready' = 'idle'
  protected _error?: Error
  protected _defaults?: Data
  protected _metadata: Action<Data>['metadata']

  private _initPromise: Promise<void> | undefined

  constructor(
    public readonly options: ActionOptions,
    metadata: Action<Data>['metadata']
  ) {
    this._metadata = metadata
  }

  /**
   * Calls `setup` and sets status accordingly. Throws error if defaults are not
   * successfully set by the end and thus the action is not ready.
   */
  async init() {
    // If already ready, do nothing.
    if (this.ready) {
      return
    }

    // If _initPromise does not yet exist, perform setup.
    if (!this._initPromise) {
      this._initPromise = new Promise(async (resolve, reject) => {
        this._status = 'loading'
        this._error = undefined

        try {
          await this.setup()

          // Verify defaults are set. If not, throw an error.
          if (this.defaults) {
            this._status = 'ready'
            this._initPromise = undefined
            resolve()
          } else {
            throw new Error(
              `No defaults provided for action with key ${this.key}`
            )
          }
        } catch (error) {
          this._error = error instanceof Error ? error : new Error(`${error}`)
          this._status = 'error'
          this._initPromise = undefined
          reject(this._error)
        }
      })
    }

    return this._initPromise
  }

  /**
   * Actions should override this to load any data needed for encoding/decoding
   * and set defaults. `init` wraps this and sets the status accordingly.
   *
   * By default, do nothing, in case the action sets constant defaults using the
   * instance variable `_defaults` and needs no other setup.
   */
  setup(): void | Promise<void> {}

  /**
   * Allow setting defaults only inside of the class (for use in `setup`).
   */
  protected set defaults(data: Data) {
    this._defaults = data
  }

  get metadata() {
    return this._metadata
  }

  get status() {
    return this._status
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
    return this._error
  }

  get defaults(): Data {
    if (!this._defaults) {
      throw new Error('Defaults not loaded')
    }
    return this._defaults
  }

  abstract encode(
    data: Data,
    context: ActionEncodeContext
  ):
    | UnifiedCosmosMsg
    | UnifiedCosmosMsg[]
    | Promise<UnifiedCosmosMsg | UnifiedCosmosMsg[]>

  abstract match(
    messages: ProcessedMessage[]
  ): ActionMatch | Promise<ActionMatch>

  abstract decode(
    messages: ProcessedMessage[]
  ): Partial<Data> | Promise<Partial<Data>>

  transformImportData?(data: any): Data
}
