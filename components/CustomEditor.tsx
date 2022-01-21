import {
  MessageMapEntry,
  ProposalMessageType,
} from 'models/proposal/messageMap'
import { ProposalAction } from 'models/proposal/proposalActions'
import React, { useState } from 'react'
import { useThemeContext } from '../contexts/theme'
import JSON5 from 'json5'
import { makeWasmMessage } from 'util/messagehelpers'
import { Controlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'

// This check is to prevent this import to be server side rendered.
if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
  require('codemirror/mode/javascript/javascript.js')
}

type JSONError = {
  lineNumber?: number
  message?: string
}

function getEditorTheme(appTheme: string): string {
  return appTheme !== 'junoDark' ? 'default' : 'material'
}

export default function CustomEditor({
  dispatch,
  customMsg,
}: {
  dispatch: (action: ProposalAction) => void
  customMsg: MessageMapEntry
}) {
  const [error, setError] = useState<JSONError | undefined>(undefined)
  const [lastInputJson, setLastInputJson] = useState<any>(undefined)
  const [isValidJson, setIsValidJson] = useState<boolean>(true)
  const themeContext = useThemeContext()

  const cmOptions = {
    mode: {
      name: 'javascript',
      json: true,
    },
    theme: getEditorTheme(themeContext.theme),
    lineNumbers: true,
    lineWrapping: true,
    autoCloseBrackets: true,
    tabSize: 2,
    gutters: ['CodeMirror-lint-markers'],
    lint: true,
  }

  function updateCustom(message: any) {
    try {
      const id = customMsg?.id ?? ''
      const messageType = customMsg?.messageType ?? ProposalMessageType.Custom
      let action: ProposalAction
      // If it is a WasmMsg, make sure it's properly encoded
      if (message.wasm) message = makeWasmMessage(message)

      if (id) {
        action = {
          type: 'updateMessage',
          id,
          message,
        }
      } else {
        action = {
          type: 'addMessage',
          message,
          messageType,
        }
      }
      dispatch(action)
    } catch (err) {
      console.error(err)
    }
  }

  const placeholder =
    lastInputJson?.length !== 0
      ? lastInputJson
        ? lastInputJson
        : JSON5.stringify(customMsg.message)
      : ''

  let errorMessage = ''
  if (error) {
    errorMessage = `${error?.message} at line ${error?.lineNumber}`
  }

  let status = (
    <div
      className={
        isValidJson ? 'flex h-10 text-green-500 p-2' : 'h-10 text-red-500 p-2'
      }
    >
      {isValidJson ? 'JSON is valid' : errorMessage}
    </div>
  )

  function isJsonString(str: string) {
    try {
      JSON5.parse(str)
      setError(undefined)
    } catch (e: any) {
      setError(e)
      return false
    }
    return true
  }

  function handleMessage(value: string) {
    if (isJsonString(value)) {
      setLastInputJson(value)
      setIsValidJson(true)
      updateCustom(JSON5.parse(value))
    } else {
      setLastInputJson(value)
      setIsValidJson(false)
    }
  }

  return (
    <div className="mt-4 border box-border rounded">
      {status}
      <CodeMirror
        value={placeholder}
        options={cmOptions}
        onBeforeChange={(editor: any, data: any, value: any) => {
          handleMessage(value)
        }}
      />
    </div>
  )
}
