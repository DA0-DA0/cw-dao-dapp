import { IbcClient, Link, Logger } from '@confio/relayer'
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import chalk from 'chalk'
import { Command } from 'commander'
import dotenv from 'dotenv'

import {
  chainQueries,
  makeGetSignerOptions,
  makeReactQueryClient,
  skipQueries,
} from '@dao-dao/state'
import { ChainId, PolytoneConnection } from '@dao-dao/types'
import { Order } from '@dao-dao/types/protobuf/codegen/ibc/core/channel/v1/channel'
import {
  getNativeTokenForChainId,
  getRpcForChainId,
  ibcProtoRpcClientRouter,
  interchainSecurityProtoRpcClientRouter,
  maybeGetChainForChainId,
} from '@dao-dao/utils'

import { getBlockMaxGas, instantiateContract } from '../utils'
import { chains } from './config'

const { log } = console

const { parsed: { MNEMONIC } = {} } = dotenv.config()

if (!MNEMONIC) {
  log(chalk.red('MNEMONIC not set'))
  process.exit(1)
}

const program = new Command()
program.requiredOption('-s, --src <chain ID>', 'source chain ID')
program.requiredOption('-d, --dest <chain ID>', 'destination chain ID')
program.option(
  '-c, --existing-connection <connection ID>',
  'existing source connection ID that connects to the destination. if not provided, will attempt to resolve this automatically if a transfer channel exists between the chains, failing otherwise.'
)
program.option(
  '-n, --new-connection',
  'create a new IBC connection. you probably do not want to use this if a connection already exists. creating your own connection increases the risk that the IBC clients expire and need to be reset, since activity keeps connections alive. using an existing connection means there is a higher chance others will be using the connection, which is a good thing.'
)
program.option(
  '--note <contract address>',
  'note contract to use, instead of creating a new one. you may use this if the script errored before.'
)
program.option(
  '--listener <contract address>',
  'listener contract to use, instead of creating a new one. you may use this if the script errored before.'
)
program.option(
  '--voice <contract address>',
  'voice contract to use, instead of creating a new one. you may use this if the script errored before.'
)

program.parse(process.argv)
const {
  src: srcChainId,
  dest: destChainId,
  existingConnection,
  newConnection,
  note: _note,
  listener: _listener,
  voice: _voice,
} = program.opts()

const main = async () => {
  const queryClient = await makeReactQueryClient()

  const { noteCodeId, listenerCodeId } =
    chains[srcChainId as keyof typeof chains] || {}
  if (!noteCodeId || !listenerCodeId) {
    throw new Error(
      `Source chain ${srcChainId} note and/or listener code IDs not configured`
    )
  }

  const {
    voiceCodeId,
    proxyCodeId,
    addrLen: destAddrLen,
  } = chains[destChainId as keyof typeof chains] || {}
  if (!voiceCodeId || !proxyCodeId) {
    throw new Error(
      `Destination chain ${destChainId} voice and/or proxy code IDs not configured`
    )
  }

  const [srcChain, destChain] = await Promise.all([
    maybeGetChainForChainId(srcChainId) ||
      // Fetch from Skip API if doesn't exist locally.
      queryClient.fetchQuery(
        skipQueries.chain(queryClient, {
          chainId: srcChainId,
        })
      ),
    maybeGetChainForChainId(destChainId) ||
      // Fetch from Skip API if doesn't exist locally.
      queryClient.fetchQuery(
        skipQueries.chain(queryClient, {
          chainId: destChainId,
        })
      ),
    queryClient.prefetchQuery(
      chainQueries.dynamicGasPrice({ chainId: srcChainId })
    ),
    queryClient.prefetchQuery(
      chainQueries.dynamicGasPrice({ chainId: destChainId })
    ),
  ])

  const srcSigner = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: srcChain.bech32Prefix,
  })
  const srcSender = (await srcSigner.getAccounts())[0].address

  const destSigner = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: destChain.bech32Prefix,
  })
  const destSender = (await destSigner.getAccounts())[0].address

  log()
  log(
    chalk.underline(
      `Connecting ${srcChain.chainName} to ${destChain.chainName} with ${srcSender} and ${destSender}...`
    )
  )

  const ibcLogger: Logger = {
    error: (msg) => {
      log(chalk.red(msg))
      return ibcLogger
    },
    warn: (msg) => {
      log(chalk.yellow(msg))
      return ibcLogger
    },
    info: (msg) => {
      log(chalk.green(msg))
      return ibcLogger
    },
    verbose: (msg) => {
      log(chalk.blue(msg))
      return ibcLogger
    },
    debug: (msg) => {
      log(chalk.cyan(msg))
      return ibcLogger
    },
  }

  const [
    srcClient,
    srcIbcQueryClient,
    srcIbcClient,
    srcBlockMaxGas,
    destClient,
    destIbcQueryClient,
    destIbcClient,
    destBlockMaxGas,
  ] = await Promise.all([
    SigningCosmWasmClient.connectWithSigner(
      getRpcForChainId(srcChainId),
      srcSigner,
      makeGetSignerOptions(queryClient)(srcChain.chainName)
    ),
    ibcProtoRpcClientRouter.connect(srcChainId),
    IbcClient.connectWithSigner(
      getRpcForChainId(srcChainId),
      srcSigner,
      srcSender,
      {
        gasPrice: makeGetSignerOptions(queryClient)(srcChain.chainName)
          .gasPrice!,
        // How long it waits in between checking for a new block.
        estimatedBlockTime: 3000,
        // How long it waits until looking for acks.
        estimatedIndexerTime: 3000,
        logger: ibcLogger,
      }
    ),
    getBlockMaxGas({ chainId: srcChainId }),
    SigningCosmWasmClient.connectWithSigner(
      getRpcForChainId(destChainId),
      destSigner,
      makeGetSignerOptions(queryClient)(destChain.chainName)
    ),
    ibcProtoRpcClientRouter.connect(destChainId),
    IbcClient.connectWithSigner(
      getRpcForChainId(destChainId),
      destSigner,
      destSender,
      {
        gasPrice: makeGetSignerOptions(queryClient)(destChain.chainName)
          .gasPrice!,
        // How long it waits in between checking for a new block.
        estimatedBlockTime: 3000,
        // How long it waits until looking for acks.
        estimatedIndexerTime: 3000,
        logger: ibcLogger,
      }
    ),
    getBlockMaxGas({ chainId: destChainId }),
  ])

  /**
   * Get the connection ID from the source to the destination chain, by reverse
   * engineering the transfer channel for the fee denom.
   */
  const getSrcConnectionId = async () => {
    const { trace } = await queryClient.fetchQuery(
      skipQueries.recommendedAsset(queryClient, {
        fromChainId: destChainId,
        denom: getNativeTokenForChainId(destChainId).denomOrAddress,
        toChainId: srcChainId,
      })
    )

    if (!trace) {
      throw new Error('No trace found')
    }

    const parts = trace.split('/')
    if (parts.length !== 2) {
      throw new Error('Expected 2 parts in trace. Got: ' + trace)
    }
    if (parts[0] !== 'transfer') {
      throw new Error('Expected transfer port in trace. Got: ' + trace)
    }

    const srcChannelId = parts[1]

    const srcConnectionHops = (
      await srcIbcQueryClient.core.channel.v1.channel({
        channelId: srcChannelId,
        portId: 'transfer',
      })
    ).channel?.connectionHops
    if (!srcConnectionHops || srcConnectionHops.length !== 1) {
      throw new Error('Expected 1 connection hop. Got: ' + srcConnectionHops)
    }

    return srcConnectionHops[0]
  }

  let srcConnectionId: string | undefined
  let destConnectionId: string | undefined

  if (!newConnection) {
    log()
    log(chalk.underline('Verifying existing connection...'))

    let _srcConnectionId: string | undefined = existingConnection

    // add `connection-` prefix if just a number is provided
    if (
      _srcConnectionId &&
      !_srcConnectionId.startsWith('connection-') &&
      !isNaN(Number(_srcConnectionId))
    ) {
      _srcConnectionId = 'connection-' + _srcConnectionId
    }

    try {
      _srcConnectionId ||= await getSrcConnectionId()
    } catch (err) {
      throw new Error(
        `Failed to get source connection ID: ${err}. Set with --existing-connection or create a new connection with --new-connection.`
      )
    }

    const srcConnection = (
      await srcIbcQueryClient.core.connection.v1.connection({
        connectionId: _srcConnectionId,
      })
    ).connection
    if (!srcConnection) {
      throw new Error('No source connection found for ID: ' + _srcConnectionId)
    }

    const srcClientStatus = (
      await srcIbcQueryClient.core.client.v1.clientStatus({
        clientId: srcConnection.clientId,
      })
    ).status
    if (srcClientStatus !== 'Active') {
      throw new Error(
        `Source connection client ${srcConnection.clientId} is not active: ${srcClientStatus}`
      )
    }

    const _destConnectionId = srcConnection.counterparty?.connectionId
    if (!_destConnectionId) {
      throw new Error('No destination connection ID found')
    }

    // Ensure connections are for each other.
    const destConnection = (
      await destIbcQueryClient.core.connection.v1.connection({
        connectionId: _destConnectionId,
      })
    ).connection
    if (!destConnection) {
      throw new Error(
        'No destination connection found for ID: ' + _destConnectionId
      )
    }

    if (destConnection.counterparty?.connectionId !== _srcConnectionId) {
      throw new Error(
        'Destination connection client ID does not match source connection client ID. Is the source connection ID correct?'
      )
    }

    const destClientStatus = (
      await destIbcQueryClient.core.client.v1.clientStatus({
        clientId: destConnection.clientId,
      })
    ).status
    if (destClientStatus !== 'Active') {
      throw new Error(
        `Destination connection client ${destConnection.clientId} is not active: ${destClientStatus}`
      )
    }

    srcConnectionId = _srcConnectionId
    destConnectionId = _destConnectionId
  }

  // Create note and listener on source chain.

  log()
  log(chalk.underline('Instantiating contracts...'))

  const consolePrefixLength = 24

  const note = await instantiateContract({
    client: srcClient,
    sender: srcSender,
    chainId: srcChainId,
    id: 'note',
    codeId: noteCodeId,
    msg: {
      block_max_gas: srcBlockMaxGas,
    },
    label: `polytone_note_to_${destChainId}`,
    prefixLength: consolePrefixLength,
    override: _note,
  })

  const listener = await instantiateContract({
    client: srcClient,
    sender: srcSender,
    chainId: srcChainId,
    id: 'listener',
    codeId: listenerCodeId,
    msg: {
      note,
    },
    label: `polytone_listener_from_${destChainId}`,
    prefixLength: consolePrefixLength,
    override: _listener,
  })

  // Create voice on destination chain.

  const voice = await instantiateContract({
    client: destClient,
    sender: destSender,
    chainId: destChainId,
    id: 'voice',
    codeId: voiceCodeId,
    msg: {
      proxy_code_id: `${proxyCodeId}`,
      block_max_gas: destBlockMaxGas,
      ...(destAddrLen && {
        contract_addr_len: `${destAddrLen}`,
      }),
    },
    label: `polytone_voice_from_${srcChainId}`,
    prefixLength: consolePrefixLength,
    override: _voice,
  })

  // Connect note and voice over IBC.

  log()
  log(
    chalk.underline(
      `Opening IBC ${newConnection ? 'connection and ' : ''}channels...`
    )
  )

  let link: Link

  if (newConnection) {
    // For Neutron, which is a consumer chain, fetch unbonding period from
    // consumer chain params so we can compute trust period manually instead of
    // letting @confio/relayer fail attempting to query staking params which do
    // not exist on consumer chains. This is needed to create a new
    // connection/clients.
    const neutronIbcClient =
      srcChainId === ChainId.NeutronMainnet
        ? srcIbcClient
        : destChainId === ChainId.NeutronMainnet
          ? destIbcClient
          : undefined
    if (neutronIbcClient) {
      neutronIbcClient.query.staking.params = async () => {
        const interchainSecurityClient =
          await interchainSecurityProtoRpcClientRouter.connect(
            ChainId.NeutronMainnet
          )
        const ccvUnbondingPeriod = (
          await interchainSecurityClient.ccv.consumer.v1.queryParams()
        ).params?.unbondingPeriod
        if (!ccvUnbondingPeriod) {
          throw new Error('No CCV unbonding period found')
        }

        return {
          params: {
            unbondingTime: ccvUnbondingPeriod,
            // Not used.
            maxValidators: -1,
            maxEntries: -1,
            historicalEntries: -1,
            bondDenom: '',
            minCommissionRate: '',
          },
        }
      }
    }

    // replace auto fee with larger chain multiplier to cover gas
    const srcOriginalSignAndBroadcast = srcIbcClient.sign.signAndBroadcast.bind(
      srcIbcClient.sign
    )
    srcIbcClient.sign.signAndBroadcast = (
      signerAddress,
      messages,
      fee,
      memo,
      timeoutHeight
    ) =>
      srcOriginalSignAndBroadcast(
        signerAddress,
        messages,
        fee === 'auto' ? 2 : fee,
        memo,
        timeoutHeight
      )
    const destOriginalSignAndBroadcast =
      destIbcClient.sign.signAndBroadcast.bind(destIbcClient.sign)
    destIbcClient.sign.signAndBroadcast = (
      signerAddress,
      messages,
      fee,
      memo,
      timeoutHeight
    ) =>
      destOriginalSignAndBroadcast(
        signerAddress,
        messages,
        fee === 'auto' ? 2 : fee,
        memo,
        timeoutHeight
      )

    link = await Link.createWithNewConnections(
      srcIbcClient,
      destIbcClient,
      ibcLogger
    )

    srcConnectionId = link.endA.connectionID
    destConnectionId = link.endB.connectionID

    log(
      chalk.green(
        `created source (${srcChainId}) IBC client: ${link.endA.clientID}`
      )
    )
    log(
      chalk.green(
        `created destination (${destChainId}) IBC client: ${link.endB.clientID}`
      )
    )
  } else {
    // should never happen
    if (!srcConnectionId || !destConnectionId) {
      throw new Error(
        'Expected source and destination connection IDs to be set. Got: ' +
          srcConnectionId +
          ' and ' +
          destConnectionId
      )
    }

    link = await Link.createWithExistingConnections(
      srcIbcClient,
      destIbcClient,
      srcConnectionId,
      destConnectionId,
      ibcLogger
    )
  }

  const channelPair = await link.createChannel(
    'A',
    `wasm.${note}`,
    `wasm.${voice}`,
    Order.ORDER_UNORDERED,
    'polytone-1'
  )

  log()
  log(chalk.green('Done! UI config entry:'))

  const config: PolytoneConnection = {
    note,
    listener,
    voice,
    localConnection: srcConnectionId,
    remoteConnection: destConnectionId,
    localChannel: channelPair.src.channelId,
    remoteChannel: channelPair.dest.channelId,
  }

  log(JSON.stringify(config, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error instanceof Error) {
      console.error(chalk.red(error.stack))
    } else {
      log(chalk.red(error))
    }
    log()
    process.exit(1)
  })
