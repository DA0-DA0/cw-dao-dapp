import cloneDeep from 'lodash.clonedeep'

import { Action, IActionDecoder, ProcessedMessage } from '@dao-dao/types'

export class ActionDecoder<
  Data extends Record<string, any> = Record<string, any>,
> implements IActionDecoder<Data>
{
  private _status: 'idle' | 'loading' | 'error' | 'ready' = 'idle'
  private _error?: Error
  private _data?: Data

  constructor(
    public readonly action: Action<Data>,
    public readonly messages: ProcessedMessage[]
  ) {}

  get status() {
    return this._status
  }

  get data() {
    if (this._status !== 'ready' || !this._data) {
      throw new Error('Decoder not ready')
    }

    return this._data
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
      throw new Error('Decoder did not error')
    }

    return this._error
  }

  async decode(): Promise<Data> {
    this._status = 'loading'
    this._error = undefined
    this._data = undefined

    try {
      await this.action.init()

      const decoded = await this.action.decode(this.messages)

      this._data = {
        ...cloneDeep(this.action.defaults),
        ...decoded,
      }
      this._status = 'ready'

      return this._data
    } catch (error) {
      this._error = error instanceof Error ? error : new Error(`${error}`)
      this._status = 'error'
      throw error
    }
  }
}
