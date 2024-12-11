import fs from 'fs'
import path from 'path'

import toml from 'toml'

export type DispatchConfig = {
  default: {
    contract_dirs: string[]
    indexer_ansible_group_vars_path: string
  }
  mnemonics: Record<string, string>
}

/**
 * Path to the config file.
 */
export const dispatchConfigPath = path.join(__dirname, './config.toml')

export const getDispatchConfig = (): DispatchConfig => {
  if (!fs.existsSync(dispatchConfigPath)) {
    throw new Error(`Config file not found at ${dispatchConfigPath}`)
  }

  try {
    return toml.parse(fs.readFileSync(dispatchConfigPath, 'utf8'))
  } catch (err) {
    throw new Error(`Error parsing ${dispatchConfigPath}: ${err}`)
  }
}
