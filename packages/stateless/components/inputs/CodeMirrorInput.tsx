import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/material.css'

import clsx from 'clsx'
import dynamic from 'next/dynamic'
import {
  Control,
  Controller,
  FieldError,
  FieldPathValue,
  FieldValues,
  Path,
  Validate,
} from 'react-hook-form'

import { useThemeContext } from '../../theme'

const CodeMirror = dynamic(
  () => import('react-codemirror2').then((module) => module.Controlled),
  {
    ssr: false,
  }
)

// This check is to prevent this import to be server side rendered.
if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
  require('codemirror/mode/javascript/javascript.js')
}

export interface CodeMirrorInputProps<
  T extends FieldValues,
  U extends Path<T>,
> {
  fieldName: U
  control?: Control<T>
  validation?: Validate<FieldPathValue<T, U>>[]
  error?: FieldError
  readOnly?: boolean
  required?: boolean
  /**
   * Optionally transform value when displaying.
   */
  transform?: (value: any) => string
}

export function CodeMirrorInput<T extends FieldValues, U extends Path<T>>({
  fieldName,
  control,
  validation,
  readOnly = false,
  required,
  transform,
}: CodeMirrorInputProps<T, U>) {
  const validate = validation?.reduce(
    (a, v) => ({ ...a, [v.toString()]: v }),
    {}
  )

  const themeContext = useThemeContext()
  const editorTheme =
    themeContext.theme !== 'dark' ? 'default' : 'material-ocean'

  const cmOptions = {
    mode: {
      name: 'javascript',
      json: true,
    },
    theme: editorTheme,
    lineNumbers: false,
    lineWrapping: true,
    autoCloseBrackets: false,
    tabSize: 2,
    gutters: ['CodeMirror-lint-markers'],
    lint: true,
    readOnly,
  }

  return (
    <Controller
      control={control}
      name={fieldName}
      render={({ field: { onChange, onBlur, value } }) => (
        <CodeMirror
          className={clsx(
            'rounded',
            readOnly && 'max-h-[min(32rem,75vh)] overflow-y-auto'
          )}
          onBeforeChange={(_editor, _data, value) => onChange(value)}
          onBlur={(_instance, _event) => onBlur()}
          options={cmOptions}
          value={transform ? transform(value) : value}
        />
      )}
      rules={{ required: required && 'Required', validate: validate }}
    />
  )
}
